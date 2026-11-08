/**
 * Business Profile Performance API — métricas diárias do perfil.
 * Visualizações (Busca/Maps), cliques no site, ligações, rotas e conversas.
 */

const PERF_BASE = "https://businessprofileperformance.googleapis.com/v1";

export const IMPRESSION_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
] as const;

export const ACTION_METRICS = [
  "WEBSITE_CLICKS",
  "CALL_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_CONVERSATIONS",
] as const;

interface DatedValue {
  date: { year: number; month: number; day: number };
  value?: string;
}
interface MetricSeries {
  dailyMetric: string;
  timeSeries?: { datedValues?: DatedValue[] };
}

export function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function rangeParams(start: Date, end: Date): string {
  const p = (w: "startDate" | "endDate", d: Date) =>
    `dailyRange.${w}.year=${d.getUTCFullYear()}&dailyRange.${w}.month=${d.getUTCMonth() + 1}&dailyRange.${w}.day=${d.getUTCDate()}`;
  return `${p("startDate", start)}&${p("endDate", end)}`;
}

/** Extrai o id curto do local (locations/{id}) a partir de accounts/x/locations/y. */
export function locationId(accountLocation: string): string {
  const parts = accountLocation.split("/locations/");
  return parts.length > 1 ? `locations/${parts[1]}` : accountLocation;
}

/** Devolve, por métrica, um mapa data->valor. */
export async function fetchDailyMetrics(
  accessToken: string,
  accountLocation: string,
  metrics: readonly string[],
  start: Date,
  end: Date,
): Promise<Record<string, Map<string, number>>> {
  const loc = locationId(accountLocation);
  const params = metrics.map((m) => `dailyMetrics=${m}`).join("&");
  const url = `${PERF_BASE}/${loc}:fetchMultiDailyMetricsTimeSeries?${params}&${rangeParams(start, end)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`performance ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    multiDailyMetricTimeSeries?: { dailyMetricTimeSeries?: MetricSeries[] }[];
  };

  const out: Record<string, Map<string, number>> = {};
  for (const group of data.multiDailyMetricTimeSeries ?? []) {
    for (const s of group.dailyMetricTimeSeries ?? []) {
      const map = new Map<string, number>();
      for (const dv of s.timeSeries?.datedValues ?? []) {
        const key = `${dv.date.year}-${String(dv.date.month).padStart(2, "0")}-${String(dv.date.day).padStart(2, "0")}`;
        map.set(key, Number(dv.value ?? 0));
      }
      out[s.dailyMetric] = map;
    }
  }
  return out;
}
