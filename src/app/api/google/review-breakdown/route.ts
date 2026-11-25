import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { fetchReviewDistribution } from "@/lib/google/reviews";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Distribuição por estrela (5★/4★/3★/2★/1★) do perfil conectado — para a aba
 * de Avaliações. Pagina todas as avaliações e conta por nota (o Google não
 * expõe o histograma pronto). Carregado sob demanda quando a aba abre.
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
    const dist = await fetchReviewDistribution(token, location);
    return NextResponse.json({ ok: true, ...dist });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
