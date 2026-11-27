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
  latitude?: number;
  longitude?: number;
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
  placeId: string | null;
  lat: number | null;
  lng: number | null;
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
  // Guardamos o top 20 de cada ponto (com place_id) para montar a
  // comparação de concorrentes e a POSIÇÃO GERAL ao longo da grade.
  const top = items.slice(0, 20).map((i) => ({
    title: i.title ?? "",
    rank: i.rank_group ?? 0,
    rating: i.rating?.value ?? null,
    reviews: i.rating?.votes_count ?? null,
    me: matches(i, target),
    placeId: i.place_id ?? null,
    lat: typeof i.latitude === "number" ? i.latitude : null,
    lng: typeof i.longitude === "number" ? i.longitude : null,
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
  category: string | null; openNow: boolean | null; website: string | null; snippet: string | null;
}

/** Top N do Google Maps para a keyword a partir de (lat,lng), na ordem de ranqueamento. */
export async function mapsTop(keyword: string, lat: number, lng: number, target: MapsTarget, depth = 20): Promise<{ items: MapsTopItem[]; myRank: number | null }> {
  const res = await fetch(`${BASE}/serp/google/maps/live/advanced`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword, location_coordinate: `${lat.toFixed(6)},${lng.toFixed(6)},14z`, language_code: "pt", depth }]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { tasks?: { status_code?: number; status_message?: string; result?: { items?: (MapsItem & { latitude?: number; longitude?: number; is_paid?: boolean; main_image?: string; category?: string; url?: string; snippet?: string; work_time?: { work_hours?: { current_status?: string } } })[] }[] }[] };
  const task = data.tasks?.[0];
  if (!task) throw new Error("DataForSEO erro");
  // "No Search Results" e afins: não é erro — retorna vazio.
  if (task.status_code && task.status_code >= 40000 && !/no search result|no result/i.test(task.status_message ?? "")) {
    throw new Error(task.status_message ?? "DataForSEO erro");
  }
  const raw = (task.result?.[0]?.items ?? []).filter((i) => i.type === "maps_search" || i.type === "maps_paid");
  const items: MapsTopItem[] = raw.map((i) => ({
    rank: i.rank_group ?? 0, title: i.title ?? "",
    rating: i.rating?.value ?? null, reviews: i.rating?.votes_count ?? null,
    isPaid: !!i.is_paid || i.type === "maps_paid",
    lat: typeof i.latitude === "number" ? i.latitude : null,
    lng: typeof i.longitude === "number" ? i.longitude : null,
    image: i.main_image ?? null,
    category: i.category ?? null,
    openNow: (() => { const st = i.work_time?.work_hours?.current_status; return st ? /open/i.test(st) && !/close/i.test(st) : null; })(),
    website: i.url ?? null,
    snippet: i.snippet ?? null,
    me: matches(i, target),
  }));
  const hit = items.find((i) => i.me);
  return { items, myRank: hit?.rank ?? null };
}

// ────────────────────────────────────────────────────────────────────────
// Prospecção: lista de empresas do Google Maps para um termo + cidade
// ────────────────────────────────────────────────────────────────────────

export interface Prospect {
  rank: number;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  claimed: boolean | null; // perfil reivindicado pelo dono (quando o Google informa)
  placeId: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
}

/** Créditos consumidos por busca de prospecção (até PROSPECT_DEPTH empresas). */
export const PROSPECT_CREDITS = 10;
export const PROSPECT_DEPTH = 100;

/**
 * Busca empresas no Google Maps para "termo em cidade" (ex.: "imobiliária em
 * Taubaté"), em todo o Brasil. Só dados públicos da ficha: nome, endereço,
 * telefone, site, nota e nº de avaliações. E-mail não existe no Google Maps.
 */
export async function mapsProspects(query: string, depth = PROSPECT_DEPTH, at?: { lat: number; lng: number; zoom?: number }): Promise<Prospect[]> {
  const res = await fetch(`${BASE}/serp/google/maps/live/advanced`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    // O Maps só devolve empresas quando a busca parte de um ponto: com as
    // coordenadas da cidade (zoom de cidade). Sem ponto, cai no país inteiro
    // (costuma voltar vazio).
    body: JSON.stringify([
      at
        ? { keyword: query, location_coordinate: `${at.lat.toFixed(6)},${at.lng.toFixed(6)},${at.zoom ?? 12}z`, language_code: "pt", depth }
        : { keyword: query, location_code: 2076, language_code: "pt", depth },
    ]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
  type Raw = MapsItem & { phone?: string; url?: string; category?: string; is_claimed?: boolean };
  const data = (await res.json()) as { tasks?: { status_code?: number; status_message?: string; result?: { items?: Raw[] }[] }[] };
  logDfsCost(`prospeccao (maps, depth ${depth})`, data);
  const task = data.tasks?.[0];
  if (!task) throw new Error("DataForSEO erro");
  if (task.status_code && task.status_code >= 40000) {
    // "No Search Results": não é erro — só não achou nada.
    if (/no search result|no result/i.test(task.status_message ?? "")) {
      console.log(`[prospeccao] sem resultados para "${query}" (${at ? `${at.lat},${at.lng}` : "sem ponto"}): ${task.status_message}`);
      return [];
    }
    throw new Error(task.status_message ?? "DataForSEO erro");
  }
  const seen = new Set<string>();
  const out: Prospect[] = [];
  for (const i of task.result?.[0]?.items ?? []) {
    if (i.type !== "maps_search" || !i.title) continue; // ignora anúncios
    const key = i.place_id || i.cid || `${i.title}|${i.address ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      rank: out.length + 1,
      name: i.title,
      category: i.category ?? null,
      address: i.address ?? null,
      phone: i.phone ?? null,
      website: i.url ?? null,
      rating: i.rating?.value ?? null,
      reviews: i.rating?.votes_count ?? null,
      claimed: typeof i.is_claimed === "boolean" ? i.is_claimed : null,
      placeId: i.place_id ?? null,
      lat: typeof i.latitude === "number" ? i.latitude : null,
      lng: typeof i.longitude === "number" ? i.longitude : null,
      mapsUrl: i.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${i.place_id}`
        : i.cid ? `https://www.google.com/maps?cid=${i.cid}` : null,
    });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// Custo real + ficha de uma empresa (alternativa à Google Places API)
// ────────────────────────────────────────────────────────────────────────

/** Registra no log o valor que o DataForSEO cobrou pela chamada (campo `cost`, em US$). */
export function logDfsCost(label: string, data: unknown): void {
  try {
    const d = data as { cost?: number; tasks?: { cost?: number }[] };
    const cost = typeof d.cost === "number" ? d.cost : d.tasks?.[0]?.cost;
    if (typeof cost === "number") console.log(`[dataforseo-custo] ${label}: US$ ${cost}`);
  } catch { /* só log */ }
}

export interface BusinessInfo {
  name: string;
  address?: string;
  category?: string;
  additionalCategories?: string[];
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  totalPhotos?: number;
  mainImage?: string;
  weekdayDescriptions?: string[];
  openNow?: boolean;
  lat?: number;
  lng?: number;
  claimed?: boolean;
  priceLevel?: string;
}

const DIAS: [string, string][] = [
  ["monday", "segunda-feira"], ["tuesday", "terça-feira"], ["wednesday", "quarta-feira"], ["thursday", "quinta-feira"],
  ["friday", "sexta-feira"], ["saturday", "sábado"], ["sunday", "domingo"],
];

/**
 * Ficha pública de UMA empresa pelo place_id (Business Data → My Business
 * Info, ao vivo). Usada pela Pré-análise quando a cota grátis do Google
 * Places do mês já foi consumida. Devolve null se não encontrar.
 */
export async function businessInfo(placeId: string): Promise<BusinessInfo | null> {
  const res = await fetch(`${BASE}/business_data/google/my_business_info/live`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword: `place_id:${placeId}`, location_code: 2076, language_code: "pt" }]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${await res.text()}`);
  type T = { hour?: number; minute?: number };
  type Item = {
    title?: string; description?: string; category?: string; additional_categories?: string[]; address?: string;
    phone?: string; url?: string; rating?: { value?: number; votes_count?: number }; total_photos?: number; main_image?: string;
    latitude?: number; longitude?: number; is_claimed?: boolean; price_level?: string;
    work_time?: { work_hours?: { timetable?: Record<string, { open?: T; close?: T }[] | null>; current_status?: string } };
  };
  const data = (await res.json()) as { tasks?: { status_code?: number; status_message?: string; cost?: number; result?: { items?: Item[] }[] }[] };
  logDfsCost("pre-analise (my_business_info)", data);
  const task = data.tasks?.[0];
  if (!task) throw new Error("DataForSEO erro");
  if (task.status_code && task.status_code >= 40000) {
    if (/no search result|no result/i.test(task.status_message ?? "")) return null;
    throw new Error(task.status_message ?? "DataForSEO erro");
  }
  const i = task.result?.[0]?.items?.[0];
  if (!i?.title) return null;

  const hhmm = (t?: T) => `${String(t?.hour ?? 0).padStart(2, "0")}:${String(t?.minute ?? 0).padStart(2, "0")}`;
  const tt = i.work_time?.work_hours?.timetable;
  const weekdayDescriptions = tt
    ? DIAS.map(([k, label]) => {
        const slots = tt[k];
        return `${label}: ${slots && slots.length ? slots.map((s) => `${hhmm(s.open)}–${hhmm(s.close)}`).join(", ") : "Fechado"}`;
      })
    : undefined;
  const st = i.work_time?.work_hours?.current_status;

  return {
    name: i.title,
    address: i.address ?? undefined,
    category: i.category ?? undefined,
    additionalCategories: i.additional_categories ?? undefined,
    phone: i.phone ?? undefined,
    website: i.url ?? undefined,
    rating: i.rating?.value ?? undefined,
    reviewCount: i.rating?.votes_count ?? undefined,
    description: i.description ?? undefined,
    totalPhotos: typeof i.total_photos === "number" ? i.total_photos : undefined,
    mainImage: i.main_image ?? undefined,
    weekdayDescriptions,
    openNow: st ? /open/i.test(st) && !/close/i.test(st) : undefined,
    lat: typeof i.latitude === "number" ? i.latitude : undefined,
    lng: typeof i.longitude === "number" ? i.longitude : undefined,
    claimed: typeof i.is_claimed === "boolean" ? i.is_claimed : undefined,
    priceLevel: i.price_level ?? undefined,
  };
}
