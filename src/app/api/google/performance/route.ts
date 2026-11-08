import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import {
  ACTION_METRICS,
  IMPRESSION_METRICS,
  dayKey,
  fetchDailyMetrics,
  fetchSearchKeywords,
} from "@/lib/google/performance";
import { fetchReviewStats } from "@/lib/google/reviews";
import { getReviewLink } from "@/lib/google/business";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sumWindow(map: Map<string, number> | undefined, days: Date[]): number {
  if (!map) return 0;
  let total = 0;
  for (const d of days) total += map.get(dayKey(d)) ?? 0;
  return total;
}

function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null; // null = "novo" (sem base)
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  let start: Date;
  let end: Date;
  if (startParam && endParam) {
    start = new Date(`${startParam}T00:00:00Z`);
    end = new Date(`${endParam}T00:00:00Z`);
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (end > yesterday) end = yesterday;
  } else {
    const period = Math.min(Math.max(parseInt(searchParams.get("period") ?? "30", 10), 7), 540);
    end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (period - 1));
  }

  const periodDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (periodDays - 1));

  const curDays: Date[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) curDays.push(new Date(d));
  const prevDays: Date[] = [];
  for (let d = new Date(prevStart); d <= prevEnd; d.setUTCDate(d.getUTCDate() + 1)) prevDays.push(new Date(d));

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);
    const metrics = [...IMPRESSION_METRICS, ...ACTION_METRICS];
    const data = await fetchDailyMetrics(accessToken, location, metrics, prevStart, end);

    // Impressões: soma das 4 fontes por dia.
    const impDay = (d: Date) =>
      IMPRESSION_METRICS.reduce((s, m) => s + (data[m]?.get(dayKey(d)) ?? 0), 0);

    const impCur = curDays.reduce((s, d) => s + impDay(d), 0);
    const impPrev = prevDays.reduce((s, d) => s + impDay(d), 0);

    const metric = (name: string) => ({
      current: sumWindow(data[name], curDays),
      previous: sumWindow(data[name], prevDays),
      change: pct(sumWindow(data[name], curDays), sumWindow(data[name], prevDays)),
    });

    const kpis = {
      impressions: { current: impCur, previous: impPrev, change: pct(impCur, impPrev) },
      website: metric("WEBSITE_CLICKS"),
      calls: metric("CALL_CLICKS"),
      directions: metric("BUSINESS_DIRECTION_REQUESTS"),
      conversations: metric("BUSINESS_CONVERSATIONS"),
    };

    const series = curDays.map((d) => ({ date: dayKey(d), value: impDay(d) }));

    // Como as pessoas descobriram (ordem fixa para cores consistentes).
    const sources = [
      { key: "search_mobile", label: "Pesquisa Google – dispositivos móveis", value: sumWindow(data["BUSINESS_IMPRESSIONS_MOBILE_SEARCH"], curDays) },
      { key: "search_desktop", label: "Pesquisa Google – computadores", value: sumWindow(data["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"], curDays) },
      { key: "maps_mobile", label: "Google Maps – dispositivos móveis", value: sumWindow(data["BUSINESS_IMPRESSIONS_MOBILE_MAPS"], curDays) },
      { key: "maps_desktop", label: "Google Maps – computadores", value: sumWindow(data["BUSINESS_IMPRESSIONS_DESKTOP_MAPS"], curDays) },
    ];

    const monthsBack = Math.min(
      18,
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1,
    );
    const [reviews, keywords, reviewLink] = await Promise.all([
      fetchReviewStats(accessToken, location).catch(() => null),
      fetchSearchKeywords(accessToken, location, monthsBack).catch(() => []),
      getReviewLink(accessToken, location).catch(() => null),
    ]);

    return NextResponse.json({
      ok: true,
      periodDays,
      range: { start: dayKey(start), end: dayKey(end) },
      kpis,
      series,
      sources,
      keywords,
      reviews,
      reviewLink,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
