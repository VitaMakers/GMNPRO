/**
 * Auditoria automática do perfil conectado: lê informações, fotos, postagens e
 * avaliações via Business Profile API e avalia os itens do checklist sozinho.
 */

import { locationId } from "./performance";

const BUSINESS_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_V4 = "https://mybusiness.googleapis.com/v4";

async function getJson<T>(url: string, token: string, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) return res.json();
      const body = await res.text();
      lastErr = new Error(`GET ${url} -> ${res.status}: ${body}`);
      if (res.status < 500 && res.status !== 429) break; // erro definitivo
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error("falha");
}

interface LocationDetails {
  title?: string;
  categories?: {
    primaryCategory?: { displayName?: string };
    additionalCategories?: { displayName?: string }[];
  };
  storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string };
  serviceArea?: unknown;
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  regularHours?: { periods?: unknown[] };
  specialHours?: { specialHourPeriods?: unknown[] };
  profile?: { description?: string };
  attributes?: { name?: string }[];
  latlng?: { latitude?: number; longitude?: number };
  openInfo?: { status?: string; openingDate?: { year?: number; month?: number; day?: number } };
  metadata?: {
    mapsUri?: string;
    newReviewUri?: string;
    placeId?: string;
    hasVoiceOfMerchant?: boolean;
    canOperateLocalPost?: boolean;
  };
}

async function getLocationDetails(token: string, accountLocation: string): Promise<LocationDetails> {
  const loc = locationId(accountLocation); // locations/{id}
  const readMask =
    "title,categories,storefrontAddress,serviceArea,phoneNumbers,websiteUri,regularHours,specialHours,profile,latlng,openInfo,metadata";
  return getJson<LocationDetails>(`${BUSINESS_INFO}/${loc}?readMask=${readMask}`, token);
}

/** Coordenadas + placeId + título do local (para geo-grid e mapa). */
export async function getLocationGeo(
  token: string,
  accountLocation: string,
): Promise<{ lat: number | null; lng: number | null; placeId: string | null; title: string }> {
  const loc = locationId(accountLocation);
  const d = await getJson<LocationDetails>(`${BUSINESS_INFO}/${loc}?readMask=title,latlng,metadata`, token);
  return {
    lat: typeof d.latlng?.latitude === "number" ? d.latlng.latitude : null,
    lng: typeof d.latlng?.longitude === "number" ? d.latlng.longitude : null,
    placeId: d.metadata?.placeId ?? null,
    title: d.title ?? "",
  };
}

/** Atributos do local (wi-fi, acessibilidade, etc.) — endpoint separado. */
async function getAttributes(token: string, accountLocation: string): Promise<number> {
  try {
    const loc = locationId(accountLocation);
    const data = await getJson<{ attributes?: { name?: string }[] }>(
      `${BUSINESS_INFO}/${loc}/attributes`,
      token,
    );
    return (data.attributes ?? []).length;
  } catch {
    return -1; // -1 = não deu para ler
  }
}

/** Perguntas e respostas (Q&A) do perfil. */
async function getQandA(
  token: string,
  accountLocation: string,
): Promise<{ total: number; answered: number } | null> {
  try {
    const loc = locationId(accountLocation);
    const data = await getJson<{ questions?: { totalAnswerCount?: number }[] }>(
      `https://mybusinessqanda.googleapis.com/v1/${loc}/questions?pageSize=30`,
      token,
    );
    const qs = data.questions ?? [];
    const answered = qs.filter((q) => (q.totalAnswerCount ?? 0) > 0).length;
    return { total: qs.length, answered };
  } catch {
    return null;
  }
}

interface MediaItem {
  locationAssociation?: { category?: string };
  createTime?: string;
  mediaFormat?: string;
  googleUrl?: string;
  thumbnailUrl?: string;
}

async function listMediaRaw(token: string, accountLocation: string): Promise<MediaItem[]> {
  const data = await getJson<{ mediaItems?: MediaItem[] }>(
    `${LEGACY_V4}/${accountLocation}/media?pageSize=100`,
    token,
  );
  return data.mediaItems ?? [];
}

interface LocalPost {
  createTime?: string;
  state?: string;
  callToAction?: { actionType?: string };
}

async function listLocalPosts(token: string, accountLocation: string): Promise<LocalPost[]> {
  const data = await getJson<{ localPosts?: LocalPost[] }>(
    `${LEGACY_V4}/${accountLocation}/localPosts?pageSize=20`,
    token,
  );
  return data.localPosts ?? [];
}

interface RawReview {
  createTime?: string;
  reviewReply?: { comment?: string };
}

async function listReviews(
  token: string,
  accountLocation: string,
): Promise<{ reviews: RawReview[]; average: number; total: number }> {
  const data = await getJson<{
    reviews?: RawReview[];
    averageRating?: number;
    totalReviewCount?: number;
  }>(`${LEGACY_V4}/${accountLocation}/reviews?pageSize=50&orderBy=updateTime%20desc`, token);
  return {
    reviews: data.reviews ?? [],
    average: data.averageRating ?? 0,
    total: data.totalReviewCount ?? data.reviews?.length ?? 0,
  };
}

export type AutoResult = Record<string, { done: boolean; detail?: string; status?: "bom" | "razoavel" | "fraco" }>;

/** Lê o perfil e devolve, por item do checklist, se está feito (e um detalhe). */
export interface AuditProfile {
  title: string;
  category: string;
  secondaryCategories: string[];
  address: string;
  phone: string;
  website: string;
  description: string;
  rating: number;
  reviewCount: number;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
  mapsUri: string | null;
  searchUri: string | null;
  verified: boolean;
  open: boolean;
  foundingDate: string | null;
  hoursCount: number;
  photoCount: number;
  postCount: number;
}

export async function runProfileAudit(
  token: string,
  accountLocation: string,
): Promise<{ auto: AutoResult; stats: Record<string, unknown>; profile: AuditProfile }> {
  const auto: AutoResult = {};
  const stats: Record<string, unknown> = {};
  const profile: AuditProfile = {
    title: "",
    category: "",
    secondaryCategories: [],
    address: "",
    phone: "",
    website: "",
    description: "",
    rating: 0,
    reviewCount: 0,
    photoUrl: null,
    lat: null,
    lng: null,
    mapsUri: null,
    searchUri: null,
    verified: false,
    open: true,
    foundingDate: null,
    hoursCount: 0,
    photoCount: 0,
    postCount: 0,
  };
  const now = Date.now();
  const daysSince = (ms: number) => Math.floor((now - ms) / 86_400_000);

  // Informações básicas + descrição
  try {
    const d = await getLocationDetails(token, accountLocation);
    if (d.title) auto.nome = { done: true, detail: d.title };
    profile.title = d.title ?? "";
    const primary = d.categories?.primaryCategory?.displayName;
    profile.category = primary ?? "";
    auto.cat_principal = { done: !!primary, detail: primary };
    const secList = (d.categories?.additionalCategories ?? [])
      .map((c) => c.displayName)
      .filter(Boolean) as string[];
    profile.secondaryCategories = secList;
    const sec = secList.length;
    auto.cat_secundarias = { done: sec > 0, detail: sec ? `${sec} categoria(s)` : undefined };
    const addrLine = (d.storefrontAddress?.addressLines ?? []).join(", ");
    const city = [d.storefrontAddress?.locality, d.storefrontAddress?.administrativeArea].filter(Boolean).join(" - ");
    profile.address = [addrLine, city].filter(Boolean).join(", ");
    const hasAddr = (d.storefrontAddress?.addressLines?.length ?? 0) > 0 || !!d.serviceArea;
    auto.endereco = { done: hasAddr };
    const hoursCount = d.regularHours?.periods?.length ?? 0;
    profile.hoursCount = hoursCount;
    auto.horarios = { done: hoursCount > 0 };
    profile.phone = d.phoneNumbers?.primaryPhone ?? "";
    auto.telefone = { done: !!d.phoneNumbers?.primaryPhone, detail: d.phoneNumbers?.primaryPhone };
    profile.website = d.websiteUri ?? "";
    auto.site = { done: !!d.websiteUri, detail: d.websiteUri };
    const desc = (d.profile?.description ?? "").trim();
    profile.description = desc;
    auto.descricao = { done: desc.length >= 50, detail: desc ? `${desc.length} caracteres` : undefined };

    // Coordenadas, status e links
    if (typeof d.latlng?.latitude === "number" && typeof d.latlng?.longitude === "number") {
      profile.lat = d.latlng.latitude;
      profile.lng = d.latlng.longitude;
    }
    profile.mapsUri = d.metadata?.mapsUri ?? null;
    profile.verified = !!d.metadata?.hasVoiceOfMerchant;
    auto.verificado = { done: profile.verified, detail: profile.verified ? "verificado" : "não verificado" };
    profile.open = d.openInfo?.status ? d.openInfo.status === "OPEN" : true;
    const od = d.openInfo?.openingDate;
    if (od?.year) {
      profile.foundingDate = [od.day, od.month, od.year].filter(Boolean).join("/");
    }
    auto.fundacao = { done: !!profile.foundingDate, detail: profile.foundingDate ?? undefined };
    // Link "Ver na Pesquisa": abre direto a aba de AVALIAÇÕES do perfil no Google.
    if (d.metadata?.placeId) {
      profile.searchUri = `https://search.google.com/local/reviews?placeid=${d.metadata.placeId}`;
    }
  } catch (e) {
    stats.infoError = (e as Error).message;
  }

  // Atributos (endpoint separado)
  const attrCount = await getAttributes(token, accountLocation);
  if (attrCount >= 0) auto.atributos = { done: attrCount > 0, detail: attrCount ? `${attrCount} atributo(s)` : "nenhum" };

  // Q&A
  const qa = await getQandA(token, accountLocation);
  if (qa) {
    auto.qa = {
      done: qa.total > 0 && qa.answered > 0,
      detail: qa.total ? `${qa.answered}/${qa.total} respondidas` : "sem perguntas",
    };
  }

  // Fotos
  try {
    const media = await listMediaRaw(token, accountLocation);
    const cats = new Set(
      media.map((m) => m.locationAssociation?.category).filter(Boolean) as string[],
    );
    const hasCover = cats.has("COVER");
    const hasLogo = cats.has("PROFILE") || cats.has("LOGO");
    auto.foto_capa = { done: hasCover, detail: hasCover ? "capa definida" : "sem capa" };
    auto.logo = { done: hasLogo, detail: hasLogo ? "logo definido" : "sem logo" };
    const variety = ["EXTERIOR", "INTERIOR", "PRODUCT", "TEAM", "FOOD_AND_DRINK", "AT_WORK", "MENU"].filter(
      (c) => cats.has(c),
    ).length;
    const photosOnly = media.filter((m) => m.mediaFormat !== "VIDEO").length;
    auto.fotos_variadas = {
      done: photosOnly >= 8 || variety >= 2,
      status: photosOnly >= 8 || variety >= 2 ? "bom" : photosOnly >= 3 ? "razoavel" : "fraco",
      detail: `${photosOnly} foto(s)${variety ? ` · ${variety} tipo(s)` : ""}`,
    };
    const newestMedia = Math.min(...media.filter((m) => m.createTime).map((m) => daysSince(new Date(m.createTime!).getTime())));
    const recent = Number.isFinite(newestMedia) && newestMedia <= 31;
    auto.fotos_recentes = {
      done: recent,
      status: recent ? "bom" : Number.isFinite(newestMedia) && newestMedia <= 90 ? "razoavel" : "fraco",
      detail: Number.isFinite(newestMedia) ? `última foto há ${newestMedia} dia(s)` : "sem fotos",
    };
    const videoCount = media.filter((m) => m.mediaFormat === "VIDEO").length;
    auto.videos = { done: videoCount > 0, detail: videoCount ? `${videoCount} vídeo(s)` : "sem vídeos" };
    stats.photos = media.length;
    profile.photoCount = media.filter((m) => m.mediaFormat !== "VIDEO").length;
    // Foto para o card do perfil (capa/logo/qualquer).
    const pick =
      media.find((m) => m.locationAssociation?.category === "COVER") ??
      media.find((m) => m.locationAssociation?.category === "PROFILE") ??
      media.find((m) => m.mediaFormat === "PHOTO") ??
      media[0];
    profile.photoUrl = pick?.googleUrl ?? pick?.thumbnailUrl ?? null;
  } catch (e) {
    stats.mediaError = (e as Error).message;
  }

  // Postagens
  try {
    const posts = await listLocalPosts(token, accountLocation);
    const recentPost = posts.find((p) => p.createTime && daysSince(new Date(p.createTime).getTime()) <= 30);
    auto.posts = {
      done: !!recentPost,
      detail: recentPost ? `última há ${daysSince(new Date(recentPost.createTime!).getTime())} dia(s)` : undefined,
    };
    const cta = posts.some(
      (p) => p.callToAction && p.createTime && daysSince(new Date(p.createTime).getTime()) <= 60,
    );
    auto.botao = { done: cta };
    stats.posts = posts.length;
    profile.postCount = posts.length;
  } catch (e) {
    stats.postsError = (e as Error).message;
  }

  // Avaliações
  try {
    const { reviews, average, total } = await listReviews(token, accountLocation);
    auto.nota = { done: average >= 4.5 && total > 0, detail: total ? `${average.toFixed(1)} ★` : "sem avaliações" };
    if (reviews.length === 0) {
      auto.responder = { done: true, detail: "sem avaliações" };
      auto.volume = { done: false, detail: "sem avaliações" };
    } else {
      const replied = reviews.filter((r) => r.reviewReply?.comment).length;
      auto.responder = {
        done: replied >= Math.ceil(reviews.length * 0.9),
        detail: `${replied}/${reviews.length} respondidas`,
      };
      const recentReview = reviews.some(
        (r) => r.createTime && daysSince(new Date(r.createTime).getTime()) <= 30,
      );
      auto.volume = { done: recentReview };
      // "Peço avaliações": última avaliação há 1–5 dias = bom; 6–7 = razoável; >7 = fraco.
      const newest = Math.min(
        ...reviews.filter((r) => r.createTime).map((r) => daysSince(new Date(r.createTime!).getTime())),
      );
      if (Number.isFinite(newest)) {
        const status = newest <= 5 ? "bom" : newest <= 7 ? "razoavel" : "fraco";
        auto.pedir = { done: status === "bom", status, detail: `última avaliação há ${newest} dia(s)` };
      }
    }
    if (reviews.length === 0) auto.pedir = { done: false, status: "fraco", detail: "sem avaliações" };
    stats.reviewsTotal = total;
    stats.reviewsAvg = average;
    profile.rating = average;
    profile.reviewCount = total;
  } catch (e) {
    stats.reviewsError = (e as Error).message;
  }

  return { auto, stats, profile };
}
