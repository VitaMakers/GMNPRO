import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getValidAccessToken } from "@/lib/google/token";
import { dataForSeoConfigured } from "@/lib/dataforseo";
import { gridCredits, GRID_SIZES } from "@/lib/geogrid";
import { executeRanking } from "@/lib/rankingRun";
import { getCredits, spendCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Histórico de análises do perfil. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const { data, error } = await supabase
    .from("ranking_runs")
    .select("id, keyword, grid_size, spacing_km, center_lat, center_lng, points, avg_rank, top3_pct, top10_pct, credits_used, created_at")
    .eq("user_id", user.id)
    .eq("location_name", location)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ runs: [] });
  return NextResponse.json({ runs: data ?? [] });
}

/** Roda uma análise de geo-grid. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) return NextResponse.json({ error: "sem_acesso" }, { status: 403 });
  if (!access.entitlements.geoGrid) {
    return NextResponse.json({ error: "recurso_de_agencia", detail: "Disponível nos planos Agência." }, { status: 403 });
  }
  if (!dataForSeoConfigured()) {
    return NextResponse.json(
      { error: "not_configured", detail: "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD não configurados." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    location?: string;
    keyword?: string;
    grid?: number;
    spacingKm?: number;
  };
  const location = body.location?.trim();
  const keyword = body.keyword?.trim();
  const grid = Number(body.grid ?? 7);
  const spacingKm = Math.min(10, Math.max(0.25, Number(body.spacingKm ?? 1)));
  if (!location || !keyword) return NextResponse.json({ error: "dados_incompletos" }, { status: 400 });
  if (!(GRID_SIZES as readonly number[]).includes(grid)) {
    return NextResponse.json({ error: "grade_invalida" }, { status: 400 });
  }

  const need = gridCredits(grid);
  const credits = await getCredits(supabase, user.id, access);
  if (credits < need) {
    return NextResponse.json(
      { error: "sem_creditos", detail: `Esta grade usa ${need} créditos; você tem ${credits}.`, credits },
      { status: 402 },
    );
  }

  try {
    const token = await getValidAccessToken(supabase, user.id);
    const run = await executeRanking(supabase, user.id, token, { location, keyword, grid, spacingKm });

    await spendCredits(supabase, user.id, need);
    const remaining = Math.max(0, credits - need);

    return NextResponse.json({ ok: true, run, credits: remaining, title: run.title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro ao analisar";
    if (msg === "sem_coordenadas") {
      return NextResponse.json({ error: "sem_coordenadas", detail: "O Google não retornou coordenadas para este perfil." }, { status: 422 });
    }
    return NextResponse.json({ error: "falha", detail: msg }, { status: 502 });
  }
}
