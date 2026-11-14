import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestKeywords, systemProvider, type Provider } from "@/lib/ai";
import { decryptSecret } from "@/lib/crypto";
import { dataForSeoConfigured, searchVolumes } from "@/lib/dataforseo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sugere palavras-chave (IA) e traz o volume de busca mensal (DataForSEO). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { location?: string; extra?: string; category?: string };
  if (!body.location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const [{ data: settings }, { data: loc }] = await Promise.all([
    supabase.from("review_settings").select("business_name, provider, api_key").eq("location_name", body.location).maybeSingle(),
    supabase.from("gmb_locations").select("title, address").eq("location_name", body.location).maybeSingle(),
  ]);

  let clientKey: string | undefined;
  if (settings?.api_key) {
    try { clientKey = decryptSecret(settings.api_key); } catch { clientKey = undefined; }
  }
  const hasOwn = !!settings?.provider && !!clientKey;
  const provider = (hasOwn ? (settings!.provider as Provider) : systemProvider());

  // Cidade a partir do endereço cacheado ("..., Sorocaba - SP").
  const city = (loc?.address ?? "").split(",").pop()?.replace(/-\s*[A-Z]{2}\s*$/, "").trim() || undefined;

  try {
    const ideas = await suggestKeywords(
      provider,
      { businessName: settings?.business_name || loc?.title || "empresa", category: body.category, city, extra: body.extra },
      hasOwn ? clientKey : undefined,
    );
    if (!dataForSeoConfigured()) {
      return NextResponse.json({ ok: true, keywords: ideas.map((k) => ({ keyword: k, volume: null, competition: null })), volumes: false });
    }
    const vols = await searchVolumes(ideas);
    const byKw = new Map(vols.map((v) => [v.keyword, v]));
    const keywords = ideas
      .map((k) => byKw.get(k.toLowerCase()) ?? { keyword: k, volume: 0, competition: null })
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return NextResponse.json({ ok: true, keywords, volumes: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
