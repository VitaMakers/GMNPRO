"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import MetricChart from "@/components/MetricChart";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";

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

export default function DesempenhoDashboard({
  locations,
}: {
  locations: { location_name: string; title: string | null }[];
}) {
  const active = useActiveProfile();
  const location = active ?? locations[0]?.location_name ?? "";
  const activeTitle =
    locations.find((l) => l.location_name === location)?.title ?? "seu perfil";

  const [mode, setMode] = useState<"30" | "90" | "custom">("30");
  const now = new Date();
  const defEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const defStart = `${sixAgo.getFullYear()}-${String(sixAgo.getMonth() + 1).padStart(2, "0")}`;
  const [customStart, setCustomStart] = useState(defStart);
  const [customEnd, setCustomEnd] = useState(defEnd);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  // Garante um perfil ativo mesmo sem passar pelo cabeçalho.
  useEffect(() => {
    if (locations[0]) initActiveProfile(locations[0].location_name);
  }, [locations]);

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError("");
    try {
      let qs = `location=${encodeURIComponent(location)}`;
      if (mode === "custom" && appliedRange) {
        qs += `&start=${appliedRange.start}&end=${appliedRange.end}`;
      } else {
        qs += `&period=${mode === "90" ? 90 : 30}`;
      }
      const res = await fetch(`/api/google/performance?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setReport(data);
    } catch (e) {
      setError(`Não foi possível carregar: ${e instanceof Error ? e.message : "erro"}`);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [location, mode, appliedRange]);

  useEffect(() => {
    load();
  }, [load]);

  function applyCustom() {
    const [sy, sm] = customStart.split("-").map(Number);
    const [ey, em] = customEnd.split("-").map(Number);
    const start = `${sy}-${String(sm).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(ey, em, 0)).getUTCDate();
    const end = `${ey}-${String(em).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    setAppliedRange({ start, end });
  }

  const insights = report ? buildInsights(report) : [];
  const periodLabel = mode === "90" ? "últimos 90 dias" : mode === "custom" ? "período escolhido" : "últimos 30 dias";

  return (
    <div className="space-y-5">
      {/* Controles de período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Mostrando <span className="font-medium text-foreground">{activeTitle}</span> · {periodLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border bg-surface p-0.5">
            {([["30", "30 dias"], ["90", "3 meses"], ["custom", "Personalizado"]] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${mode === m ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="month" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand" />
              <span className="text-muted">–</span>
              <input type="month" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand" />
              <button onClick={applyCustom} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90">Aplicar</button>
            </div>
          )}
          <button onClick={() => window.print()} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface">
            Baixar PDF
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Carregando dados do Google…</p>}
      {error && <p className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}

      {report && !loading && (
        <>
          <p className="text-xs text-muted">
            Período: {fmt(report.range.start)} a {fmt(report.range.end)} · comparado com os {report.periodDays} dias anteriores.
          </p>

          {/* Herói: número grande + card verde */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-border bg-white p-6 card-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Visualizações do perfil · {periodLabel}
              </p>
              <div className="mt-1 flex items-end gap-3">
                <p className="font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
                  {report.kpis.impressions.current.toLocaleString("pt-BR")}
                </p>
                <ChangePill change={report.kpis.impressions.change} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MiniStat label="Cliques no site" kpi={report.kpis.website} />
                <MiniStat label="Ligações" kpi={report.kpis.calls} />
                <MiniStat label="Rotas" kpi={report.kpis.directions} />
                <MiniStat label="Conversas" kpi={report.kpis.conversations} />
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl bg-brand-2 p-6 text-white card-soft">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold">
                    IA
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Resumo do período</p>
                    <p className="text-xs text-white/70">Leitura do seu perfil</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/90">
                  {insights[0] ?? "Seu perfil está ativo. Mantenha fotos novas, postagens semanais e pedidos de avaliação para crescer."}
                </p>
              </div>
              <Link
                href="/avaliacoes"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-2 transition hover:bg-white/90"
              >
                Responder avaliações →
              </Link>
            </div>
          </div>

          {/* Gráfico de visualizações por dia */}
          <div className="rounded-3xl border border-border bg-white p-6 card-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Visualizações por dia</p>
                <p className="text-xs text-muted">Evolução no período, com projeção do Google.</p>
              </div>
            </div>
            <MetricChart data={report.series} label="Visualizações por dia" />
          </div>

          {/* 3 cards: origem · resumo de visualizações · termos */}
          <div className="grid gap-4 lg:grid-cols-3">
            {report.sources?.length > 0 ? (
              <SourcesPanel sources={report.sources} />
            ) : (
              <EmptyCard title="De onde vêm" />
            )}
            <VisaoGeralCard report={report} />
            {report.keywords?.length > 0 ? (
              <KeywordsPanel keywords={report.keywords} />
            ) : (
              <EmptyCard title="Termos de pesquisa" />
            )}
          </div>

          {/* Avaliações */}
          {report.reviews && <ReviewsPanel r={report.reviews} link={report.reviewLink} />}

          {/* Insights */}
          {insights.length > 0 && (
            <div className="rounded-3xl border border-border bg-white p-6 card-soft">
              <h2 className="mb-3 text-base font-semibold">Oportunidades e insights</h2>
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

function ChangePill({ change }: { change: number | null }) {
  if (change === null) return <span className="mb-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">novo</span>;
  const up = change > 0;
  const down = change < 0;
  return (
    <span
      className={`mb-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? "bg-brand/15 text-brand-2" : down ? "bg-red-400/15 text-red-500" : "bg-surface-2 text-muted"
      }`}
    >
      {up ? "▲" : down ? "▼" : "■"} {Math.abs(change)}%
    </span>
  );
}

function MiniStat({ label, kpi }: { label: string; kpi: Kpi }) {
  const up = kpi.change !== null && kpi.change > 0;
  const down = kpi.change !== null && kpi.change < 0;
  return (
    <div>
      <p className="text-xl font-bold">{kpi.current.toLocaleString("pt-BR")}</p>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-[11px] font-medium ${up ? "text-brand-2" : down ? "text-red-500" : "text-muted"}`}>
        {kpi.change === null ? "novo" : `${up ? "▲" : down ? "▼" : "■"} ${Math.abs(kpi.change)}%`}
      </p>
    </div>
  );
}

const SOURCE_COLORS = ["#FBBC04", "#4285F4", "#EA4335", "#34A853"];

function SourcesPanel({ sources }: { sources: { label: string; value: number }[] }) {
  const total = sources.reduce((s, x) => s + x.value, 0);
  const R = 56;
  const SW = 20;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <p className="text-sm font-semibold">De onde vêm</p>
      <p className="mb-4 text-xs text-muted">Como as pessoas encontraram o perfil</p>

      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0 -rotate-90">
          {total === 0 ? (
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth={SW} />
          ) : (
            sources.map((s, i) => {
              const len = (s.value / total) * C;
              const gap = len > 4 ? 2 : 0;
              const seg = (
                <circle key={s.label} cx="70" cy="70" r={R} fill="none" stroke={SOURCE_COLORS[i % 4]} strokeWidth={SW} strokeDasharray={`${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}`} strokeDashoffset={-offset} />
              );
              offset += len;
              return seg;
            })
          )}
        </svg>
        <ul className="w-full space-y-2">
          {sources.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCE_COLORS[i % 4] }} />
              <span className="flex-1 truncate text-xs text-muted">{s.label}</span>
              <span className="shrink-0 text-sm font-semibold">
                {s.value.toLocaleString("pt-BR")}
                <span className="ml-1 text-xs font-normal text-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VisaoGeralCard({ report }: { report: Report }) {
  const k = report.kpis;
  const totalViews = k.impressions.current;
  const actions = k.website.current + k.calls.current + k.directions.current + k.conversations.current;
  const rows: { label: string; value: number }[] = [
    { label: "Visualizações totais", value: totalViews },
    { label: "Cliques no site", value: k.website.current },
    { label: "Ligações", value: k.calls.current },
    { label: "Pedidos de rota", value: k.directions.current },
    { label: "Conversas", value: k.conversations.current },
  ];
  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <p className="text-sm font-semibold">Resumo de visualizações</p>
      <p className="mb-4 text-xs text-muted">Tudo que o Google registrou no período</p>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0">
            <span className="text-muted">{r.label}</span>
            <span className="font-semibold">{r.value.toLocaleString("pt-BR")}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-2xl bg-brand/5 p-3">
        <p className="text-xs text-muted">Total de ações dos clientes</p>
        <p className="text-2xl font-bold text-brand-2">{actions.toLocaleString("pt-BR")}</p>
      </div>
    </div>
  );
}

function KeywordsPanel({ keywords }: { keywords: { keyword: string; value: number; approx: boolean }[] }) {
  const totalSearch = keywords.reduce((s, k) => s + k.value, 0);
  const top = keywords.slice(0, 3).map((k) => k.keyword);
  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <p className="text-sm font-semibold">Termos de pesquisa</p>
      <p className="mb-3 text-xs text-muted">{totalSearch.toLocaleString("pt-BR")} pesquisas mostraram seu perfil</p>
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
        <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/5 p-3 text-xs text-muted">
          <span className="font-medium text-brand-2">Sugestão de palavras-chave:</span> seus termos mais
          fortes são <strong>{top.join(", ")}</strong>. Inclua eles na <strong>descrição</strong>, nos{" "}
          <strong>serviços</strong> e nas <strong>postagens</strong> para reforçar o alcance.
        </div>
      )}
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-6 text-center text-xs text-muted">Sem dados suficientes no período.</p>
    </div>
  );
}

function ReviewsPanel({ r, link }: { r: Review; link: string | null }) {
  const stale = r.daysSinceLast !== null && r.daysSinceLast > 30;
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 256, margin: 1 }).then(setQr).catch(() => setQr(""));
  }, [link]);

  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <h2 className="mb-4 text-base font-semibold">Avaliações</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total de avaliações" value={r.total.toLocaleString("pt-BR")} />
        <Stat label="Nota média" value={r.average ? `${r.average.toFixed(1)} ★` : "—"} />
        <Stat label="Novas nesta semana" value={String(r.newThisWeek)} good={r.newThisWeek > 0} />
        <Stat label="Sem avaliação nova há" value={r.daysSinceLast === null ? "—" : `${r.daysSinceLast} dia${r.daysSinceLast === 1 ? "" : "s"}`} warn={stale} />
      </div>

      {link && (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface-2 p-4 sm:flex-row">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code para avaliar" className="h-28 w-28 rounded-lg bg-white p-1" />
          )}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium">Peça avaliações aos clientes</p>
            <p className="mt-1 text-xs text-muted">Compartilhe este link ou o QR code para o cliente avaliar em segundos.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:opacity-90">Abrir link de avaliação</a>
              <button onClick={() => navigator.clipboard?.writeText(link)} className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-surface">Copiar link</button>
            </div>
          </div>
        </div>
      )}
      {stale && <p className="mt-3 text-xs text-accent">Faz mais de 30 dias sem uma avaliação nova — use o link/QR acima para pedir avaliações.</p>}
    </div>
  );
}

function Stat({ label, value, good, warn }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
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
