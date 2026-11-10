import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReply, type Provider } from "@/lib/ai";
import { decryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { location, reviewer, rating, comment, avoid } = body as {
    location?: string;
    reviewer?: string;
    rating?: number;
    comment?: string;
    avoid?: string[];
  };
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  // Configurações do perfil (palavras-chave, tom, assinatura, provedor).
  const { data: settings } = await supabase
    .from("review_settings")
    .select("business_name, keywords, tone, signature, provider, api_key, examples, banned_words")
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

  const provider = (body.provider ?? settings?.provider ?? "claude") as Provider;

  try {
    const reply = await generateReply(provider, {
      businessName: settings?.business_name || loc?.title || "nossa empresa",
      keywords: settings?.keywords ?? "",
      tone: settings?.tone ?? "",
      signature: settings?.signature ?? "",
      reviewerName: reviewer ?? "Cliente",
      rating: Number(rating) || 0,
      reviewText: comment ?? "",
      examples: Array.isArray(settings?.examples) ? settings?.examples : [],
      bannedWords: settings?.banned_words ?? "",
      avoid: Array.isArray(avoid) ? avoid : [],
    }, clientKey);
    return NextResponse.json({ ok: true, reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao gerar resposta" },
      { status: 502 },
    );
  }
}
