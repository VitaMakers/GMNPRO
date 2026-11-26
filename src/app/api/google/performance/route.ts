import { NextResponse } from "next/server";
import { reportAuth } from "@/lib/reportAuth";
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
  const auth = await reportAuth(request);
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

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
    const accessToken = await getValidAccessToken(supabase, userId);
    const metrics = [...IMPRESSION_METRICS, ...ACTION_METRICS];
    const data = await fetchDailyMetrics(accessToken, location, metrics, prevStart, end);

    // Mesmo período do ANO ANTERIOR — para a comparação "ano a ano" (igual ao
    // app do Google, que compara com o mesmo intervalo do ano passado).
    const yoyStart = new Date(start);
    yoyStart.setUTCFullYear(yoyStart.getUTCFullYear() - 1);
    const yoyEnd = new Date(end);
    yoyEnd.setUTCFullYear(yoyEnd.getUTCFullYear() - 1);
    const yoyDays: Date[] = [];
    for (let d = new Date(yoyStart); d <= yoyEnd; d.setUTCDate(d.getUTCDate() + 1)) yoyDays.push(new Date(d));
    const yoyData = await fetchDailyMetrics(accessToken, location, metrics, yoyStart, yoyEnd).catch(
      () => ({}) as typeof data,
    );
    const yoySum = (names: readonly string[]) =>
      names.reduce((s, m) => s + yoyDays.reduce((a, d) => a + (yoyData[m]?.get(dayKey(d)) ?? 0), 0), 0);

    // Impressões: soma das 4 fontes por dia.
    const impDay = (d: Date) =>
      IMPRESSION_METRICS.reduce((s, m) => s + (data[m]?.get(dayKey(d)) ?? 0), 0);
    // Separadas em Busca e Maps (desktop + mobile de cada).
    const SEARCH_METRICS = ["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"] as const;
    const MAPS_METRICS = ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS"] as const;
    const searchDay = (d: Date) => SEARCH_METRICS.reduce((s, m) => s + (data[m]?.get(dayKey(d)) ?? 0), 0);
    const mapsDay = (d: Date) => MAPS_METRICS.reduce((s, m) => s + (data[m]?.get(dayKey(d)) ?? 0), 0);

    const impCur = curDays.reduce((s, d) => s + impDay(d), 0);
    const impPrev = prevDays.reduce((s, d) => s + impDay(d), 0);
    const searchCur = curDays.reduce((s, d) => s + searchDay(d), 0);
    const mapsCur = curDays.reduce((s, d) => s + mapsDay(d), 0);

    const metric = (name: string) => ({
      current: sumWindow(data[name], curDays),
      previous: sumWindow(data[name], prevDays),
      change: pct(sumWindow(data[name], curDays), sumWindow(data[name], prevDays)),
    });

    // Interações: soma de TODAS as ações (como o Google) — inclui site,
    // ligações, rotas, conversas, reservas, pedidos e cliques no cardápio.
    const intCur = ACTION_METRICS.reduce((s, m) => s + sumWindow(data[m], curDays), 0);
    const intPrev = ACTION_METRICS.reduce((s, m) => s + sumWindow(data[m], prevDays), 0);

    const kpis = {
      impressions: { current: impCur, previous: impPrev, change: pct(impCur, impPrev), changeYoY: pct(impCur, yoySum(IMPRESSION_METRICS)) },
      impressionsSearch: { current: searchCur, change: null, changeYoY: pct(searchCur, yoySum(SEARCH_METRICS)) },
      impressionsMaps: { current: mapsCur, change: null, changeYoY: pct(mapsCur, yoySum(MAPS_METRICS)) },
      interactions: { current: intCur, previous: intPrev, change: pct(intCur, intPrev), changeYoY: pct(intCur, yoySum(ACTION_METRICS)) },
      website: metric("WEBSITE_CLICKS"),
      calls: metric("CALL_CLICKS"),
      directions: metric("BUSINESS_DIRECTION_REQUESTS"),
      conversations: metric("BUSINESS_CONVERSATIONS"),
    };

    // Engajamento: série MENSAL por métrica (para o gráfico que troca por filtro).
    const MESES_AB = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
    const mkey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const months: string[] = [];
    {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      while (d <= end) {
        months.push(mkey(d));
        d.setUTCMonth(d.getUTCMonth() + 1);
      }
    }
    const monthLabels = months.map((m) => MESES_AB[parseInt(m.slice(5, 7), 10) - 1]);
    const monthlyFor = (names: readonly string[]) => {
      const acc = new Map<string, number>();
      for (const d of curDays) {
        const v = names.reduce((s, m) => s + (data[m]?.get(dayKey(d)) ?? 0), 0);
        acc.set(mkey(d), (acc.get(mkey(d)) ?? 0) + v);
      }
      return months.map((m) => acc.get(m) ?? 0);
    };
    const engMetric = (key: string, label: string, names: readonly string[]) => {
      const value = names.reduce((s, m) => s + sumWindow(data[m], curDays), 0);
      return { key, label, value, changeYoY: pct(value, yoySum(names)), series: monthlyFor(names) };
    };
    const engagement = {
      monthLabels,
      all: engMetric("all", "Todas as interações", ACTION_METRICS),
      metrics: [
        engMetric("calls", "Chamadas", ["CALL_CLICKS"]),
        engMetric("bookings", "Agendamentos", ["BUSINESS_BOOKINGS"]),
        engMetric("directions", "Orientações", ["BUSINESS_DIRECTION_REQUESTS"]),
        engMetric("website", "Cliques no website", ["WEBSITE_CLICKS"]),
        engMetric("menu", "Cardápio", ["BUSINESS_FOOD_MENU_CLICKS"]),
        engMetric("messages", "Mensagens", ["BUSINESS_CONVERSATIONS"]),
        engMetric("orders", "Pedidos", ["BUSINESS_FOOD_ORDERS"]),
      ],
    };

    const series = curDays.map((d) => ({ date: dayKey(d), value: impDay(d) }));

    // Séries DIÁRIAS por canal — para os gráficos de linha do desempenho detalhado.
    const dayVal = (name: string) => (d: Date) => data[name]?.get(dayKey(d)) ?? 0;
    const daily = {
      labels: curDays.map((d) => dayKey(d)),
      viewsTotal: curDays.map(impDay),
      viewsSearch: curDays.map(searchDay),
      viewsMaps: curDays.map(mapsDay),
      actTotal: curDays.map((d) => ACTION_METRICS.reduce((s, m) => s + (data[m]?.get(dayKey(d)) ?? 0), 0)),
      actWebsite: curDays.map(dayVal("WEBSITE_CLICKS")),
      actCalls: curDays.map(dayVal("CALL_CLICKS")),
      actRoutes: curDays.map(dayVal("BUSINESS_DIRECTION_REQUESTS")),
    };

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
    const [reviews, kwCur, kwYoY, reviewLink] = await Promise.all([
      fetchReviewStats(accessToken, location).catch(() => null),
      fetchSearchKeywords(accessToken, location, monthsBack, 0).catch(() => ({ keywords: [], total: 0 })),
      fetchSearchKeywords(accessToken, location, monthsBack, 12).catch(() => ({ keywords: [], total: 0 })),
      getReviewLink(accessToken, location).catch(() => null),
    ]);
    const keywords = kwCur.keywords;
    // Total REAL de pesquisas (soma de todos os termos) + comparação ano a ano.
    const searches = { total: kwCur.total, changeYoY: pct(kwCur.total, kwYoY.total) };

    return NextResponse.json({
      ok: true,
      periodDays,
      range: { start: dayKey(start), end: dayKey(end) },
      kpis,
      engagement,
      series,
      daily,
      sources,
      keywords,
      searches,
      reviews,
      reviewLink,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
