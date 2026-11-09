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
