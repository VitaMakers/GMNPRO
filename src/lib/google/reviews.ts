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
