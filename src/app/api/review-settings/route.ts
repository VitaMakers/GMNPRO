import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const { data } = await supabase
    .from("review_settings")
    .select("keywords, tone, signature, provider, examples, api_key, auto_reply, auto_reply_negatives")
    .eq("location_name", location)
    .maybeSingle();

  // Nunca devolvemos a chave; só informamos se existe uma salva.
  return NextResponse.json({
    ok: true,
    settings: {
      keywords: data?.keywords ?? "",
      tone: data?.tone ?? "",
      signature: data?.signature ?? "",
      provider: data?.provider ?? "groq",
      examples: Array.isArray(data?.examples) ? data?.examples : [],
      hasApiKey: !!data?.api_key,
      autoReply: !!data?.auto_reply,
      autoReplyNegatives: !!data?.auto_reply_negatives,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { location, keywords, tone, signature, provider, examples, apiKey, autoReply, autoReplyNegatives } =
    body as {
      location?: string;
      keywords?: string;
      tone?: string;
      signature?: string;
      provider?: string;
      examples?: { review: string; reply: string }[];
      apiKey?: string;
      autoReply?: boolean;
      autoReplyNegatives?: boolean;
    };
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const cleanExamples = (Array.isArray(examples) ? examples : [])
    .map((e) => ({ review: (e.review ?? "").trim(), reply: (e.reply ?? "").trim() }))
    .filter((e) => e.review && e.reply)
    .slice(0, 3);

  const row: Record<string, unknown> = {
    user_id: user.id,
    location_name: location,
    keywords: keywords?.trim() || null,
    tone: tone?.trim() || null,
    signature: signature?.trim() || null,
    provider: provider || "groq",
    examples: cleanExamples,
    auto_reply: !!autoReply,
    auto_reply_negatives: !!autoReplyNegatives,
    updated_at: new Date().toISOString(),
  };

  // Só mexe na chave se o usuário digitou uma nova. Em branco = mantém a atual.
  if (typeof apiKey === "string" && apiKey.trim()) {
    try {
      row.api_key = encryptSecret(apiKey.trim());
    } catch {
      return NextResponse.json(
        { error: "Falta configurar ENCRYPTION_KEY no ambiente para guardar a chave com segurança." },
        { status: 500 },
      );
    }
  }

  const { error } = await supabase
    .from("review_settings")
    .upsert(row, { onConflict: "user_id,location_name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
