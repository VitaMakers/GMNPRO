import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getValidAccessToken } from "@/lib/google/token";
import { getLocationGeo } from "@/lib/google/audit";
import { dataForSeoConfigured, mapsRankAt, mapLimit } from "@/lib/dataforseo";
import { buildGrid, gridCredits, summarize, GRID_SIZES, type RankedPoint } from "@/lib/geogrid";
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
    const geo = await getLocationGeo(token, location);
    if (geo.lat == null || geo.lng == null) {
      return NextResponse.json(
        { error: "sem_coordenadas", detail: "O Google não retornou coordenadas para este perfil." },
        { status: 422 },
      );
    }

    // Cacheia coordenadas (best-effort) para o Mapa de Locais.
    try {
      await supabase
        .from("gmb_locations")
        .update({ lat: geo.lat, lng: geo.lng })
        .eq("user_id", user.id)
        .eq("location_name", location);
    } catch {
      /* coluna ausente: ignora */
    }

    const points = buildGrid(geo.lat, geo.lng, grid, spacingKm);
    const target = { placeId: geo.placeId, title: geo.title };

    const ranked: RankedPoint[] = await mapLimit(points, 8, async (p) => {
      try {
        const r = await mapsRankAt(keyword, p.lat, p.lng, target);
        return { ...p, rank: r.rank };
      } catch {
        return { ...p, rank: null };
      }
    });

    const stats = summarize(ranked);

    // Debita os créditos após rodar.
    await spendCredits(supabase, user.id, need);
    const remaining = Math.max(0, credits - need);

    const { data: saved } = await supabase
      .from("ranking_runs")
      .insert({
        user_id: user.id,
        location_name: location,
        keyword,
        grid_size: grid,
        spacing_km: spacingKm,
        center_lat: geo.lat,
        center_lng: geo.lng,
        points: ranked,
        avg_rank: stats.avgRank,
        top3_pct: stats.top3Pct,
        top10_pct: stats.top10Pct,
        credits_used: need,
      })
      .select("id, created_at")
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      run: {
        id: saved?.id ?? null,
        created_at: saved?.created_at ?? new Date().toISOString(),
        keyword,
        grid_size: grid,
        spacing_km: spacingKm,
        center_lat: geo.lat,
        center_lng: geo.lng,
        points: ranked,
        avg_rank: stats.avgRank,
        top3_pct: stats.top3Pct,
        top10_pct: stats.top10Pct,
        credits_used: need,
      },
      credits: remaining,
      title: geo.title,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "falha", detail: e instanceof Error ? e.message : "erro ao analisar" },
      { status: 502 },
    );
  }
}
