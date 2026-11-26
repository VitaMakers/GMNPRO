import { NextResponse } from "next/server";
import { reportAuth } from "@/lib/reportAuth";
import { getValidAccessToken } from "@/lib/google/token";
import { fetchReviewTexts } from "@/lib/google/reviews";
import { reviewKeywords } from "@/lib/reviewKeywords";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Palavras-chave em destaque nas avaliações (standout keywords) — termos
 * mais citados, com o tom (positivo/negativo) estimado pela nota. Sem IA.
 */
export async function GET(request: Request) {
  const auth = await reportAuth(request);
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const token = await getValidAccessToken(supabase, userId);
    const texts = await fetchReviewTexts(token, location);
    const keywords = reviewKeywords(texts, { min: 3, top: 24 });
    return NextResponse.json({ ok: true, count: texts.length, keywords });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
