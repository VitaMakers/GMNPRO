"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
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
  sources: { label: string; value: number }[];
  keywords: { keyword: string; value: number; approx: boolean }[];
  reviews: Review | null;
  reviewLink: string | null;
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

          <div className="grid gap-4 lg:grid-cols-2">
            {report.sources?.length > 0 && <SourcesPanel sources={report.sources} />}
            {report.keywords?.length > 0 && <KeywordsPanel keywords={report.keywords} />}
          </div>

          {/* Avaliações */}
          {report.reviews && <ReviewsPanel r={report.reviews} link={report.reviewLink} />}

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

function SourcesPanel({ sources }: { sources: { label: string; value: number }[] }) {
  const total = sources.reduce((s, x) => s + x.value, 0) || 1;
  const max = Math.max(1, ...sources.map((s) => s.value));
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">Como as pessoas descobriram</h2>
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted">{s.label}</span>
              <span className="font-medium">
                {s.value.toLocaleString("pt-BR")}{" "}
                <span className="text-xs text-muted">({Math.round((s.value / total) * 100)}%)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand-2" style={{ width: `${(s.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeywordsPanel({ keywords }: { keywords: { keyword: string; value: number; approx: boolean }[] }) {
  const top = keywords.slice(0, 3).map((k) => k.keyword);
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Termos de pesquisa</h2>
      <p className="mb-4 text-xs text-muted">O que as pessoas buscaram antes de ver o perfil.</p>
      <ul className="space-y-1.5">
        {keywords.map((k, i) => (
          <li key={k.keyword} className="flex items-center justify-between text-sm">
            <span className="truncate">
              <span className="mr-2 text-muted">{i + 1}.</span>
              {k.keyword}
            </span>
            <span className="shrink-0 font-medium text-muted">
              {k.approx ? "<" : ""}
              {k.value.toLocaleString("pt-BR")}
            </span>
          </li>
        ))}
      </ul>
      {top.length > 0 && (
        <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs text-muted">
          <span className="font-medium text-brand-2">Sugestão de palavras-chave:</span> seus termos mais
          fortes são <strong>{top.join(", ")}</strong>. Inclua eles na <strong>descrição</strong>, nos{" "}
          <strong>serviços</strong> e nas <strong>postagens</strong> para reforçar o alcance nessas buscas.
        </div>
      )}
    </div>
  );
}

function ReviewsPanel({ r, link }: { r: Review; link: string | null }) {
  const stale = r.daysSinceLast !== null && r.daysSinceLast > 30;
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 256, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [link]);

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

      {link && (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-border bg-surface-2 p-4 sm:flex-row">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code para avaliar" className="h-28 w-28 rounded-lg bg-white p-1" />
          )}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium">Peça avaliações aos clientes</p>
            <p className="mt-1 text-xs text-muted">
              Compartilhe este link ou o QR code para o cliente avaliar em segundos.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-brand px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:opacity-90"
              >
                Abrir link de avaliação
              </a>
              <button
                onClick={() => navigator.clipboard?.writeText(link)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-surface"
              >
                Copiar link
              </button>
            </div>
          </div>
        </div>
      )}

      {stale && (
        <p className="mt-3 text-xs text-accent">
          Faz mais de 30 dias sem uma avaliação nova — use o link/QR acima para pedir avaliações.
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
