/** Avaliações do perfil (Google My Business API v4). */

const LEGACY_V4 = "https://mybusiness.googleapis.com/v4";

const STAR: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

interface RawReview {
  starRating?: string;
  createTime?: string;
  comment?: string;
  reviewer?: { displayName?: string };
}

export interface ReviewStats {
  total: number;
  average: number;
  newThisWeek: number;
  daysSinceLast: number | null;
  latest: { author: string; stars: number; comment: string; createTime: string }[];
}

export async function fetchReviewStats(
  accessToken: string,
  accountLocation: string,
): Promise<ReviewStats> {
  const url = `${LEGACY_V4}/${accountLocation}/reviews?pageSize=50&orderBy=updateTime%20desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`reviews ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    reviews?: RawReview[];
    averageRating?: number;
    totalReviewCount?: number;
  };

  const reviews = data.reviews ?? [];
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;

  let newThisWeek = 0;
  let lastTime = 0;
  for (const r of reviews) {
    if (!r.createTime) continue;
    const t = new Date(r.createTime).getTime();
    if (t > weekAgo) newThisWeek++;
    if (t > lastTime) lastTime = t;
  }

  const latest = reviews.slice(0, 5).map((r) => ({
    author: r.reviewer?.displayName ?? "Cliente",
    stars: STAR[r.starRating ?? ""] ?? 0,
    comment: r.comment ?? "",
    createTime: r.createTime ?? "",
  }));

  return {
    total: data.totalReviewCount ?? reviews.length,
    average: data.averageRating ?? 0,
    newThisWeek,
    daysSinceLast: lastTime ? Math.floor((now - lastTime) / (24 * 3600 * 1000)) : null,
    latest,
  };
}

export interface FullReview {
  name: string; // accounts/.../locations/.../reviews/{id}
  reviewer: string;
  rating: number; // 1 a 5
  comment: string;
  createTime: string;
  replied: boolean;
  replyComment: string | null;
}

/** Lista as avaliações com dados completos para a tela de resposta com IA. */
export async function listReviewsFull(
  accessToken: string,
  accountLocation: string,
): Promise<FullReview[]> {
  const url = `${LEGACY_V4}/${accountLocation}/reviews?pageSize=50&orderBy=updateTime%20desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`reviews ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    reviews?: {
      name?: string;
      starRating?: string;
      comment?: string;
      createTime?: string;
      reviewer?: { displayName?: string };
      reviewReply?: { comment?: string };
    }[];
  };
  return (data.reviews ?? []).map((r) => ({
    name: r.name ?? "",
    reviewer: r.reviewer?.displayName ?? "Cliente",
    rating: STAR[r.starRating ?? ""] ?? 0,
    comment: r.comment ?? "",
    createTime: r.createTime ?? "",
    replied: !!r.reviewReply?.comment,
    replyComment: r.reviewReply?.comment ?? null,
  }));
}

export interface ReviewDistribution {
  total: number;
  average: number;
  sampled: number;
  counts: { stars: number; count: number }[]; // 5..1
  urgent: number; // negativas (1–3★) COM texto e sem resposta
}

/** Distribuição por estrela (5★/4★/…): pagina as avaliações e conta por nota.
 *  O Google não devolve o histograma pronto, então somamos página a página. */
export async function fetchReviewDistribution(
  accessToken: string,
  accountLocation: string,
  maxPages = 60,
): Promise<ReviewDistribution> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let average = 0;
  let sampled = 0;
  let urgent = 0;
  let pageToken: string | undefined;

  for (let i = 0; i < maxPages; i++) {
    const u = new URL(`${LEGACY_V4}/${accountLocation}/reviews`);
    u.searchParams.set("pageSize", "50");
    u.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) break;
    const data = (await res.json()) as {
      reviews?: (RawReview & { reviewReply?: { comment?: string } })[];
      averageRating?: number;
      totalReviewCount?: number;
      nextPageToken?: string;
    };
    if (typeof data.totalReviewCount === "number") total = data.totalReviewCount;
    if (typeof data.averageRating === "number") average = data.averageRating;
    for (const r of data.reviews ?? []) {
      const s = STAR[r.starRating ?? ""] ?? 0;
      if (s >= 1 && s <= 5) {
        counts[s]++;
        sampled++;
      }
      // Urgente: nota baixa, com texto e ainda sem resposta do dono.
      if (s >= 1 && s <= 3 && (r.comment ?? "").trim().length > 0 && !r.reviewReply?.comment) urgent++;
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return {
    total: total || sampled,
    average,
    sampled,
    counts: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts[stars] })),
    urgent,
  };
}

/** Avaliações com texto (nota, comentário e data) para o resumo com IA —
 *  pagina algumas páginas para dar base ao critério de "tema recorrente". */
export async function fetchReviewTexts(
  accessToken: string,
  accountLocation: string,
  maxPages = 4,
): Promise<{ rating: number; comment: string; createTime: string }[]> {
  const out: { rating: number; comment: string; createTime: string }[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const u = new URL(`${LEGACY_V4}/${accountLocation}/reviews`);
    u.searchParams.set("pageSize", "50");
    u.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) break;
    const data = (await res.json()) as { reviews?: RawReview[]; nextPageToken?: string };
    for (const r of data.reviews ?? []) {
      const c = (r.comment ?? "").trim();
      if (c) out.push({ rating: STAR[r.starRating ?? ""] ?? 0, comment: c, createTime: r.createTime ?? "" });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

/** Publica (ou atualiza) a resposta do dono em uma avaliação. */
export async function postReviewReply(
  accessToken: string,
  reviewName: string,
  comment: string,
): Promise<void> {
  const res = await fetch(`${LEGACY_V4}/${reviewName}/reply`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new Error(`reply ${res.status}: ${await res.text()}`);
}
