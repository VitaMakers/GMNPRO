/**
 * Cliente DataForSEO — SERP Google Maps (live/advanced).
 * Usado pelo geo-grid: para cada ponto da grade, busca a palavra-chave no
 * Google Maps "a partir daquela coordenada" e descobre a posição do perfil.
 *
 * Credenciais (Vercel): DATAFORSEO_LOGIN e DATAFORSEO_PASSWORD.
 */

const BASE = "https://api.dataforseo.com/v3";

export function dataForSeoConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN ?? "";
  const pass = process.env.DATAFORSEO_PASSWORD ?? "";
  return "Basic " + Buffer.from(`${login}:${pass}`).toString("base64");
}

interface MapsItem {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  title?: string;
  place_id?: string;
  cid?: string;
  rating?: { value?: number; votes_count?: number };
  address?: string;
}

interface MapsResponse {
  status_code?: number;
  status_message?: string;
  tasks?: {
    status_code?: number;
    status_message?: string;
    result?: { items?: MapsItem[] }[];
  }[];
}

export interface TopItem {
  title: string;
  rank: number;
  rating: number | null;
  reviews: number | null;
  me: boolean;
}

export interface MapsTarget {
  placeId?: string | null;
  cid?: string | null;
  title?: string | null;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matches(item: MapsItem, target: MapsTarget): boolean {
  if (target.placeId && item.place_id && item.place_id === target.placeId) return true;
  if (target.cid && item.cid && item.cid === target.cid) return true;
  if (target.title && item.title) {
    const a = norm(item.title);
    const b = norm(target.title);
    if (a === b || a.includes(b) || b.includes(a)) return true;
  }
  return false;
}

/**
 * Posição do perfil no Google Maps para a keyword, buscando a partir de
 * (lat,lng). Retorna null se não aparecer no top 20.
 */
export async function mapsRankAt(
  keyword: string,
  lat: number,
  lng: number,
  target: MapsTarget,
  opts: { zoom?: number; depth?: number } = {},
): Promise<{ rank: number | null; top: TopItem[] }> {
  const zoom = opts.zoom ?? 14;
  const depth = opts.depth ?? 20;
  const res = await fetch(`${BASE}/serp/google/maps/live/advanced`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        keyword,
        location_coordinate: `${lat.toFixed(6)},${lng.toFixed(6)},${zoom}z`,
        language_code: "pt",
        depth,
      },
    ]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as MapsResponse;
  const task = data.tasks?.[0];
  if (!task || (task.status_code && task.status_code >= 40000)) {
    throw new Error(`DataForSEO: ${task?.status_message ?? data.status_message ?? "erro"}`);
  }
  const items = (task.result?.[0]?.items ?? []).filter((i) => i.type === "maps_search");
  const hit = items.find((i) => matches(i, target));
  const top = items.slice(0, 5).map((i) => ({
    title: i.title ?? "",
    rank: i.rank_group ?? 0,
    rating: i.rating?.value ?? null,
    reviews: i.rating?.votes_count ?? null,
    me: matches(i, target),
  }));
  return { rank: hit?.rank_group ?? null, top };
}

/** Executa várias consultas com concorrência limitada. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export interface KeywordVolume {
  keyword: string;
  volume: number; // média mensal (Brasil)
  competition: "LOW" | "MEDIUM" | "HIGH" | null;
}

/** Volume de busca mensal (Google Ads, Brasil, pt) para uma lista de palavras. */
export async function searchVolumes(keywords: string[]): Promise<KeywordVolume[]> {
  const list = [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 100);
  if (list.length === 0) return [];
  const res = await fetch(`${BASE}/keywords_data/google_ads/search_volume/live`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([{ keywords: list, location_code: 2076, language_code: "pt" }]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    tasks?: { status_code?: number; status_message?: string; result?: { keyword?: string; search_volume?: number | null; competition?: string | null }[] }[];
  };
  const task = data.tasks?.[0];
  if (!task || (task.status_code && task.status_code >= 40000)) throw new Error(task?.status_message ?? "DataForSEO erro");
  return (task.result ?? [])
    .map((r) => ({
      keyword: r.keyword ?? "",
      volume: r.search_volume ?? 0,
      competition: (r.competition as KeywordVolume["competition"]) ?? null,
    }))
    .filter((r) => r.keyword)
    .sort((a, b) => b.volume - a.volume);
}

export interface MapsTopItem {
  rank: number; title: string; rating: number | null; reviews: number | null;
  isPaid: boolean; lat: number | null; lng: number | null; image: string | null; me: boolean;
}

/** Top N do Google Maps para a keyword a partir de (lat,lng), na ordem de ranqueamento. */
export async function mapsTop(keyword: string, lat: number, lng: number, target: MapsTarget, depth = 20): Promise<{ items: MapsTopItem[]; myRank: number | null }> {
  const res = await fetch(`${BASE}/serp/google/maps/live/advanced`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword, location_coordinate: `${lat.toFixed(6)},${lng.toFixed(6)},14z`, language_code: "pt", depth }]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { tasks?: { status_code?: number; status_message?: string; result?: { items?: (MapsItem & { latitude?: number; longitude?: number; is_paid?: boolean; main_image?: string })[] }[] }[] };
  const task = data.tasks?.[0];
  if (!task || (task.status_code && task.status_code >= 40000)) throw new Error(task?.status_message ?? "DataForSEO erro");
  const raw = (task.result?.[0]?.items ?? []).filter((i) => i.type === "maps_search" || i.type === "maps_paid");
  const items: MapsTopItem[] = raw.map((i) => ({
    rank: i.rank_group ?? 0, title: i.title ?? "",
    rating: i.rating?.value ?? null, reviews: i.rating?.votes_count ?? null,
    isPaid: !!i.is_paid || i.type === "maps_paid",
    lat: typeof i.latitude === "number" ? i.latitude : null,
    lng: typeof i.longitude === "number" ? i.longitude : null,
    image: i.main_image ?? null,
    me: matches(i, target),
  }));
  const hit = items.find((i) => i.me);
  return { items, myRank: hit?.rank ?? null };
}
