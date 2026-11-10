import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGeotagMeta, type Provider } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { city, niche, keywords, count, provider } = body as {
    city?: string;
    niche?: string;
    keywords?: string;
    count?: number;
    provider?: string;
  };

  try {
    const items = await generateGeotagMeta((provider ?? "groq") as Provider, {
      city: String(city ?? ""),
      niche: String(niche ?? ""),
      keywords: String(keywords ?? ""),
      count: Number(count) || 1,
    });
    if (!items.length) throw new Error("A IA não retornou metadados válidos. Tente de novo.");
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao gerar metadados" },
      { status: 502 },
    );
  }
}
