/** Motor compartilhado da análise de geo-grid (usado pela rota e pelo cron). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocationGeo } from "./google/audit";
import { mapsRankAt, mapLimit, businessInfo } from "./dataforseo";
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

/** Perfil de terceiros (sem conexão com o Google): location = "place:<placeId>". */
export const PLACE_PREFIX = "place:";
export function isPlaceLocation(location: string): boolean {
  return location.startsWith(PLACE_PREFIX) && location.length > PLACE_PREFIX.length;
}

/**
 * Ponto central e nome de uma empresa qualquer, pelo place_id: DataForSEO
 * primeiro; se não vier, Google Places (quando há chave e faturamento).
 */
async function placeGeo(placeId: string, paid = true): Promise<{ lat: number | null; lng: number | null; placeId: string | null; title: string }> {
  // businessInfo (DataForSEO) custa crédito de API — só quando `paid` (durante a análise).
  if (paid) {
    try {
      const b = await businessInfo(placeId);
      if (b && typeof b.lat === "number" && typeof b.lng === "number") return { lat: b.lat, lng: b.lng, placeId, title: b.name };
    } catch { /* tenta o Google */ }
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key) {
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "displayName,location" },
      });
      if (res.ok) {
        const d = (await res.json()) as { displayName?: { text?: string }; location?: { latitude?: number; longitude?: number } };
        if (typeof d.location?.latitude === "number" && typeof d.location?.longitude === "number") {
          return { lat: d.location.latitude, lng: d.location.longitude, placeId, title: d.displayName?.text ?? "" };
        }
      }
    } catch { /* sem coordenadas */ }
  }
  return { lat: null, lng: null, placeId, title: "" };
}

/** Roda o geo-grid e salva em ranking_runs. NÃO mexe em créditos/acesso. */
export async function executeRanking(
  supabase: SupabaseClient,
  userId: string,
  token: string | null,
  params: { location: string; keyword: string; grid: number; spacingKm: number },
): Promise<RankingRunResult> {
  const third = isPlaceLocation(params.location);
  if (!third && !token) throw new Error("Conexão com o Google não encontrada.");
  const geo = third
    ? await placeGeo(params.location.slice(PLACE_PREFIX.length))
    : await getLocationGeo(token as string, params.location);
  if (geo.lat == null || geo.lng == null) throw new Error("sem_coordenadas");

  if (!third) {
    try {
      await supabase.from("gmb_locations").update({ lat: geo.lat, lng: geo.lng }).eq("user_id", userId).eq("location_name", params.location);
    } catch { /* ignora */ }
  }

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

/**
 * Centro (lat/lng) da empresa para a PRÉ-VISUALIZAÇÃO da grade — sem rodar o
 * geo-grid e sem gastar crédito de API. Perfil próprio: cache em gmb_locations,
 * senão a API de perfil do Google (grátis). Empresa de terceiros: coordenada da
 * última análise salva, senão Google Places (cota grátis). Nunca chama o
 * DataForSEO pago aqui.
 */
export async function locationCenter(
  supabase: SupabaseClient,
  userId: string,
  token: string | null,
  location: string,
): Promise<{ lat: number | null; lng: number | null; title: string }> {
  if (isPlaceLocation(location)) {
    const { data: cached } = await supabase
      .from("ranking_runs")
      .select("center_lat, center_lng, title")
      .eq("user_id", userId)
      .eq("location_name", location)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached && cached.center_lat != null && cached.center_lng != null) {
      return { lat: cached.center_lat as number, lng: cached.center_lng as number, title: (cached.title as string) ?? "" };
    }
    const g = await placeGeo(location.slice(PLACE_PREFIX.length), false);
    return { lat: g.lat, lng: g.lng, title: g.title };
  }
  const { data: loc } = await supabase
    .from("gmb_locations")
    .select("lat, lng")
    .eq("user_id", userId)
    .eq("location_name", location)
    .maybeSingle();
  if (loc && loc.lat != null && loc.lng != null) {
    return { lat: loc.lat as number, lng: loc.lng as number, title: "" };
  }
  if (!token) return { lat: null, lng: null, title: "" };
  const geo = await getLocationGeo(token, location);
  if (geo.lat != null && geo.lng != null) {
    try {
      await supabase.from("gmb_locations").update({ lat: geo.lat, lng: geo.lng }).eq("user_id", userId).eq("location_name", location);
    } catch { /* ignora */ }
  }
  return { lat: geo.lat, lng: geo.lng, title: geo.title ?? "" };
}
