import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { listReviewsFull, fetchUnansweredReviews } from "@/lib/google/reviews";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const location = params.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });
  const pendentes = params.get("pendentes") === "1";

  try {
    const token = await getValidAccessToken(supabase, user.id);
    // Pendentes: todas SEM resposta (histórico completo). Senão: recentes.
    const reviews = pendentes
      ? await fetchUnansweredReviews(token, location)
      : await listReviewsFull(token, location);
    return NextResponse.json({ ok: true, reviews });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao buscar avaliações" },
      { status: 502 },
    );
  }
}
