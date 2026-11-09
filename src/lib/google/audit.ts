/**
 * Auditoria automática do perfil conectado: lê informações, fotos, postagens e
 * avaliações via Business Profile API e avalia os itens do checklist sozinho.
 */

import { locationId } from "./performance";

const BUSINESS_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_V4 = "https://mybusiness.googleapis.com/v4";

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

interface LocationDetails {
  title?: string;
  categories?: {
    primaryCategory?: { displayName?: string };
    additionalCategories?: { displayName?: string }[];
  };
  storefrontAddress?: { addressLines?: string[] };
  serviceArea?: unknown;
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  regularHours?: { periods?: unknown[] };
  specialHours?: { specialHourPeriods?: unknown[] };
  profile?: { description?: string };
}

async function getLocationDetails(token: string, accountLocation: string): Promise<LocationDetails> {
  const loc = locationId(accountLocation); // locations/{id}
  const readMask =
    "title,categories,storefrontAddress,serviceArea,phoneNumbers,websiteUri,regularHours,specialHours,profile";
  return getJson<LocationDetails>(`${BUSINESS_INFO}/${loc}?readMask=${readMask}`, token);
}

interface MediaItem {
  locationAssociation?: { category?: string };
  createTime?: string;
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

export type AutoResult = Record<string, { done: boolean; detail?: string }>;

/** Lê o perfil e devolve, por item do checklist, se está feito (e um detalhe). */
export async function runProfileAudit(
  token: string,
  accountLocation: string,
): Promise<{ auto: AutoResult; stats: Record<string, unknown> }> {
  const auto: AutoResult = {};
  const stats: Record<string, unknown> = {};
  const now = Date.now();
  const daysSince = (ms: number) => Math.floor((now - ms) / 86_400_000);

  // Informações básicas + descrição
  try {
    const d = await getLocationDetails(token, accountLocation);
    if (d.title) auto.nome = { done: true, detail: d.title };
    const primary = d.categories?.primaryCategory?.displayName;
    auto.cat_principal = { done: !!primary, detail: primary };
    const sec = d.categories?.additionalCategories?.length ?? 0;
    auto.cat_secundarias = { done: sec > 0, detail: sec ? `${sec} categoria(s)` : undefined };
    const hasAddr = (d.storefrontAddress?.addressLines?.length ?? 0) > 0 || !!d.serviceArea;
    auto.endereco = { done: hasAddr };
    auto.horarios = { done: (d.regularHours?.periods?.length ?? 0) > 0 };
    auto.telefone = { done: !!d.phoneNumbers?.primaryPhone, detail: d.phoneNumbers?.primaryPhone };
    auto.site = { done: !!d.websiteUri, detail: d.websiteUri };
    const desc = (d.profile?.description ?? "").trim();
    auto.descricao = { done: desc.length >= 50, detail: desc ? `${desc.length} caracteres` : undefined };
  } catch (e) {
    stats.infoError = (e as Error).message;
  }

  // Fotos
  try {
    const media = await listMediaRaw(token, accountLocation);
    const cats = new Set(
      media.map((m) => m.locationAssociation?.category).filter(Boolean) as string[],
    );
    const hasCover = cats.has("COVER");
    const hasLogo = cats.has("PROFILE") || cats.has("LOGO");
    auto.foto_capa = { done: hasCover && hasLogo };
    const variety = ["EXTERIOR", "INTERIOR", "PRODUCT", "TEAM", "FOOD_AND_DRINK", "AT_WORK", "MENU"].filter(
      (c) => cats.has(c),
    ).length;
    auto.fotos_variadas = { done: variety >= 2, detail: `${variety} tipo(s) de foto` };
    const recent = media.some((m) => m.createTime && daysSince(new Date(m.createTime).getTime()) <= 31);
    auto.fotos_recentes = { done: recent };
    stats.photos = media.length;
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
    }
    stats.reviewsTotal = total;
    stats.reviewsAvg = average;
  } catch (e) {
    stats.reviewsError = (e as Error).message;
  }

  return { auto, stats };
}
