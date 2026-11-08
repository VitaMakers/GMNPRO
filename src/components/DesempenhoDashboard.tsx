"use client";

import { useCallback, useEffect, useState } from "react";
import MetricChart from "@/components/MetricChart";

interface Kpi { current: number; previous: number; change: number | null }
interface Review {
  total: number;
  average: number;
  newThisWeek: number;
  daysSinceLast: number | null;
  latest: { author: string; stars: number; comment: string; createTime: string }[];
}
interface Report {
  periodDays: number;
  range: { start: string; end: string };
  kpis: {
    impressions: Kpi;
    website: Kpi;
    calls: Kpi;
    directions: Kpi;
    conversations: Kpi;
  };
  series: { date: string; value: number }[];
  reviews: Review | null;
}

const PERIODS = [
  { days: 30, label: "30 dias" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
];

const KPI_LABELS: { key: keyof Report["kpis"]; label: string }[] = [
  { key: "impressions", label: "Visualizações" },
  { key: "website", label: "Cliques no site" },
  { key: "calls", label: "Ligações" },
  { key: "directions", label: "Rotas" },
  { key: "conversations", label: "Conversas" },
];

export default function DesempenhoDashboard({
  locations,
}: {
  locations: { location_name: string; title: string | null }[];
}) {
  const [location, setLocation] = useState(locations[0]?.location_name ?? "");
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/google/performance?location=${encodeURIComponent(location)}&period=${period}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setReport(data);
    } catch (e) {
      setError(`Não foi possível carregar: ${e instanceof Error ? e.message : "erro"}`);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [location, period]);

  useEffect(() => {
    load();
  }, [load]);

  const insights = report ? buildInsights(report) : [];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {locations.map((l) => (
            <option key={l.location_name} value={l.location_name}>{l.title ?? l.location_name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${period === p.days ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2"
          >
            Baixar PDF
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Carregando dados do Google…</p>}
      {error && <p className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-400">{error}</p>}

      {report && !loading && (
        <>
          <p className="text-xs text-muted">
            Período: {fmt(report.range.start)} a {fmt(report.range.end)} · comparado com os {report.periodDays} dias anteriores.
          </p>

          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {KPI_LABELS.map(({ key, label }) => (
              <KpiTile key={key} label={label} kpi={report.kpis[key]} />
            ))}
          </div>

          {/* Gráfico */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-lg font-semibold">Visualizações ao longo do tempo</h2>
            <MetricChart data={report.series} label="Visualizações por dia" />
          </div>

          {/* Avaliações */}
          {report.reviews && <ReviewsPanel r={report.reviews} />}

          {/* Insights */}
          {insights.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-lg font-semibold">Oportunidades e insights</h2>
              <ul className="space-y-2">
                {insights.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <span className="mt-0.5 text-brand-2">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiTile({ label, kpi }: { label: string; kpi: Kpi }) {
  const up = kpi.change !== null && kpi.change > 0;
  const down = kpi.change !== null && kpi.change < 0;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{kpi.current.toLocaleString("pt-BR")}</p>
      <p className={`mt-1 text-xs font-medium ${up ? "text-brand-2" : down ? "text-red-400" : "text-muted"}`}>
        {kpi.change === null ? "novo" : `${up ? "▲" : down ? "▼" : "■"} ${Math.abs(kpi.change)}% vs. período anterior`}
      </p>
    </div>
  );
}

function ReviewsPanel({ r }: { r: Review }) {
  const stale = r.daysSinceLast !== null && r.daysSinceLast > 30;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">Avaliações</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total de avaliações" value={r.total.toLocaleString("pt-BR")} />
        <Stat label="Nota média" value={r.average ? `${r.average.toFixed(1)} ★` : "—"} />
        <Stat label="Novas nesta semana" value={String(r.newThisWeek)} good={r.newThisWeek > 0} />
        <Stat
          label="Sem avaliação nova há"
          value={r.daysSinceLast === null ? "—" : `${r.daysSinceLast} dia${r.daysSinceLast === 1 ? "" : "s"}`}
          warn={stale}
        />
      </div>
      {stale && (
        <p className="mt-3 text-xs text-accent">
          Faz mais de 30 dias sem uma avaliação nova — vale pedir avaliações aos clientes (link e QR code).
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, good, warn }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${good ? "text-brand-2" : warn ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function fmt(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildInsights(r: Report): string[] {
  const out: string[] = [];
  const imp = r.kpis.impressions.change;
  const calls = r.kpis.calls.change;
  const web = r.kpis.website.change;

  if (imp !== null && imp >= 15) out.push(`Suas visualizações cresceram ${imp}% — o perfil está ganhando alcance. Mantenha a constância de fotos e postagens.`);
  if (imp !== null && imp <= -15) out.push(`As visualizações caíram ${Math.abs(imp)}% — vale aumentar a frequência de postagens e fotos novas para recuperar alcance.`);
  if (imp !== null && imp > 0 && calls !== null && calls < 0) out.push(`Mais gente viu o perfil, mas as ligações caíram — revise o botão de ação e o telefone em destaque.`);
  if (web !== null && web >= 15) out.push(`Cliques no site subiram ${web}% — considere destacar ofertas/agendamento no site para converter mais.`);
  if (r.reviews && r.reviews.daysSinceLast !== null && r.reviews.daysSinceLast > 30) out.push(`Há ${r.reviews.daysSinceLast} dias sem avaliação nova — avaliações recentes melhoram a confiança e o ranqueamento.`);
  if (out.length === 0) out.push("Desempenho estável no período. Continue com fotos novas, postagens semanais e pedidos de avaliação para crescer.");
  return out;
}
