import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBusinessDescription, type Provider } from "@/lib/ai";
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
  const { location, mode, extra } = body as { location?: string; mode?: "new" | "improve"; extra?: string };
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

  const provider = (body.provider ?? settings?.provider ?? "claude") as Provider;

  try {
    const description = await generateBusinessDescription(
      provider,
      {
        mode: mode === "improve" && current ? "improve" : "new",
        businessName: settings?.business_name || loc?.title || "nossa empresa",
        keywords: settings?.keywords ?? "",
        current,
        extra: typeof extra === "string" ? extra : "",
      },
      clientKey,
    );
    return NextResponse.json({ ok: true, description, current });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao gerar descrição" },
      { status: 502 },
    );
  }
}
