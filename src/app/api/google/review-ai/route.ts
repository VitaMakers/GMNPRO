import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { fetchReviewTexts } from "@/lib/google/reviews";
import { summarizeReviews } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Resumo com IA das avaliações (elogios/reclamações) do perfil conectado —
 * para a aba de Avaliações. Lê as avaliações com texto e resume com a IA do
 * sistema. Carregado sob demanda quando a aba abre.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const token = await getValidAccessToken(supabase, user.id);
    const texts = await fetchReviewTexts(token, location);
    if (texts.length === 0) {
      return NextResponse.json({ ok: true, praises: [], complaints: [], summary: "", count: 0 });
    }
    const insights = await summarizeReviews(texts);
    return NextResponse.json({ ok: true, ...insights, count: texts.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
