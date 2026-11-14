import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBusinessDescription, systemProvider, type Provider } from "@/lib/ai";
import { decryptSecret } from "@/lib/crypto";
import { getValidAccessToken } from "@/lib/google/token";
import { getProfileDescription } from "@/lib/google/business";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { location, mode, extra, keywords: kwList } = body as {
    location?: string; mode?: "new" | "improve"; extra?: string; keywords?: string[];
  };
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const { data: settings } = await supabase
    .from("review_settings")
    .select("business_name, keywords, provider, api_key")
    .eq("location_name", location)
    .maybeSingle();

  let clientKey: string | undefined;
  if (settings?.api_key) {
    try {
      clientKey = decryptSecret(settings.api_key);
    } catch {
      clientKey = undefined;
    }
  }

  const { data: loc } = await supabase
    .from("gmb_locations")
    .select("title")
    .eq("location_name", location)
    .maybeSingle();

  // Limite de 3 gerações por perfil por mês (best-effort; não bloqueia se a
  // tabela ainda não existir). Conta só a geração, não a publicação.
  const LIMIT = 3;
  const ym = new Date().toISOString().slice(0, 7);
  try {
    const { data: usage } = await supabase
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("location_name", location)
      .eq("ym", ym)
      .eq("kind", "description")
      .maybeSingle();
    if ((usage?.count ?? 0) >= LIMIT) {
      return NextResponse.json(
        { error: "limite", detail: `Você já gerou ${LIMIT} descrições para este perfil neste mês.` },
        { status: 429 },
      );
    }
  } catch {
    /* tabela ausente: não aplica limite */
  }

  // Para "melhorar", lê a descrição atual direto do Google.
  let current = "";
  if (mode === "improve") {
    try {
      const token = await getValidAccessToken(supabase, user.id);
      current = await getProfileDescription(token, location);
    } catch {
      current = "";
    }
  }

  // Se houver uma chave OpenAI do sistema (sua, escondida), as descrições
  // usam o ChatGPT com ela. Senão, usa o provedor/chave configurados no perfil.
  // Padrão: IA gratuita do sistema. Se o usuário configurou provedor + chave própria, usa a dele.
  const hasOwn = !!settings?.provider && !!clientKey;
  const provider = (hasOwn ? (settings!.provider as Provider) : systemProvider());
  const keyToUse = hasOwn ? clientKey : undefined;

  try {
    const description = await generateBusinessDescription(
      provider,
      {
        mode: mode === "improve" && current ? "improve" : "new",
        businessName: settings?.business_name || loc?.title || "nossa empresa",
        keywords: Array.isArray(kwList) && kwList.length ? kwList.join(", ") : (settings?.keywords ?? ""),
        current,
        extra: typeof extra === "string" ? extra : "",
      },
      keyToUse,
    );

    // Registra o uso (best-effort).
    try {
      const { data: u } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("location_name", location)
        .eq("ym", ym)
        .eq("kind", "description")
        .maybeSingle();
      await supabase.from("ai_usage").upsert(
        { user_id: user.id, location_name: location, ym, kind: "description", count: (u?.count ?? 0) + 1 },
        { onConflict: "user_id,location_name,ym,kind" },
      );
    } catch {
      /* ignora */
    }

    return NextResponse.json({ ok: true, description, current });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao gerar descrição" },
      { status: 502 },
    );
  }
}
