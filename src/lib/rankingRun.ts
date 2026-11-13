/** Motor compartilhado da análise de geo-grid (usado pela rota e pelo cron). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocationGeo } from "./google/audit";
import { mapsRankAt, mapLimit } from "./dataforseo";
import { buildGrid, summarize, type RankedPoint } from "./geogrid";

export interface RankingRunResult {
  id: string | null;
  created_at: string;
  keyword: string;
  grid_size: number;
  spacing_km: number;
  center_lat: number;
  center_lng: number;
  points: RankedPoint[];
  avg_rank: number | null;
  top3_pct: number;
  top10_pct: number;
  credits_used: number;
  title: string;
}

/** Roda o geo-grid e salva em ranking_runs. NÃO mexe em créditos/acesso. */
export async function executeRanking(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  params: { location: string; keyword: string; grid: number; spacingKm: number },
): Promise<RankingRunResult> {
  const geo = await getLocationGeo(token, params.location);
  if (geo.lat == null || geo.lng == null) throw new Error("sem_coordenadas");

  try {
    await supabase.from("gmb_locations").update({ lat: geo.lat, lng: geo.lng }).eq("user_id", userId).eq("location_name", params.location);
  } catch { /* ignora */ }

  const points = buildGrid(geo.lat, geo.lng, params.grid, params.spacingKm);
  const target = { placeId: geo.placeId, title: geo.title };
  const ranked: RankedPoint[] = await mapLimit(points, 8, async (p) => {
    try {
      const r = await mapsRankAt(params.keyword, p.lat, p.lng, target);
      return { ...p, rank: r.rank, top: r.top };
    } catch {
      return { ...p, rank: null };
    }
  });
  const stats = summarize(ranked);
  const need = params.grid * params.grid;

  const { data: saved } = await supabase
    .from("ranking_runs")
    .insert({
      user_id: userId, location_name: params.location, keyword: params.keyword,
      grid_size: params.grid, spacing_km: params.spacingKm, center_lat: geo.lat, center_lng: geo.lng,
      points: ranked, avg_rank: stats.avgRank, top3_pct: stats.top3Pct, top10_pct: stats.top10Pct, credits_used: need,
    })
    .select("id, created_at")
    .maybeSingle();

  return {
    id: saved?.id ?? null, created_at: saved?.created_at ?? new Date().toISOString(),
    keyword: params.keyword, grid_size: params.grid, spacing_km: params.spacingKm,
    center_lat: geo.lat, center_lng: geo.lng, points: ranked,
    avg_rank: stats.avgRank, top3_pct: stats.top3Pct, top10_pct: stats.top10Pct, credits_used: need, title: geo.title,
  };
}
