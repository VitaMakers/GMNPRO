"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import MetricChart from "@/components/MetricChart";
import ProfileStrengthCard from "@/components/ProfileStrengthCard";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";

interface Kpi { current: number; previous: number; change: number | null; changeYoY?: number | null }
interface EngMetric { key: string; label: string; value: number; changeYoY: number | null; series: number[] }
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
    interactions: Kpi;
    website: Kpi;
    calls: Kpi;
    directions: Kpi;
    conversations: Kpi;
  };
  engagement?: { monthLabels: string[]; all: EngMetric; metrics: EngMetric[] };
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

      {/* Força do perfil (anel) — igual ao app do Google, com dado real da Análise Completa */}
      {location && (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <ProfileStrengthCard location={location} title={activeTitle} />
          <DesempenhoResumo location={location} />
        </div>
      )}

      {loading && <p className="text-sm text-muted">Carregando dados do Google…</p>}
      {error && <p className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}

      {report && !loading && (
        <>
          <p className="text-xs text-muted">
            Período: {fmt(report.range.start)} a {fmt(report.range.end)} · comparado com os {report.periodDays} dias anteriores.
          </p>

          {/* Herói: número grande + card verde */}
          <div id="desempenho-detalhe" className="grid scroll-mt-24 gap-4 lg:grid-cols-[1.4fr_1fr]">
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

          {/* Desempenho em abas (Visão geral · Engajamento · Avaliações · Tendências · Público-alvo) */}
          <DesempenhoAbas report={report} />

          {/* Avaliações (bloco atual, mantido — pedir avaliações com link/QR) */}
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

// Abrevia números grandes como o app do Google: 119000 -> "119 mil".
function fmtK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
  if (n >= 1_000) return (n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
  return n.toLocaleString("pt-BR");
}

const MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
function mesAbrev(iso: string) {
  return MESES[parseInt(iso.slice(5, 7), 10) - 1] ?? "";
}

// Resumo do Desempenho (ao lado da Força do perfil), como o app do Google:
// Visualizações, Interações e Pesquisas dos ÚLTIMOS 6 MESES (mesmo período que
// o app mostra), puxado ao vivo da API oficial e atualizado sozinho.
function DesempenhoResumo({ location }: { location: string }) {
  const [rep, setRep] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location) {
      setLoading(false);
      return;
    }
    let ok = true;
    setLoading(true);
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 meses atrás (dia 1)
    const start = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-01`;
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fetch(`/api/google/performance?location=${encodeURIComponent(location)}&start=${start}&end=${end}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Report | null) => { if (ok) setRep(d); })
      .catch(() => {})
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [location]);

  const periodo = rep?.range
    ? `de ${mesAbrev(rep.range.start)} a ${mesAbrev(rep.range.end)} de ${rep.range.end.slice(0, 4)}`
    : "últimos 6 meses";

  return (
    <div className="flex flex-col rounded-3xl border border-border bg-white p-6 card-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-base font-bold">Desempenho</p>
          <p className="text-xs text-muted">{periodo}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand-2">● ao vivo</span>
      </div>
      {loading ? (
        <p className="mt-6 flex-1 text-sm text-muted">Carregando dados do Google…</p>
      ) : rep ? (
        <div className="mt-5 grid flex-1 grid-cols-3 items-start gap-2 text-center">
          <ResumoMetric value={rep.kpis.impressions.current} label="Visualizações" />
          <ResumoMetric value={rep.kpis.interactions.current} label="Interações" />
          <ResumoMetric value={(rep.keywords ?? []).reduce((acc, x) => acc + x.value, 0)} label="Pesquisas" />
        </div>
      ) : (
        <p className="mt-6 flex-1 text-sm text-muted">Sem dados no período.</p>
      )}
      {rep && (
        <button
          onClick={() => document.getElementById("desempenho-abas")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="mt-4 self-end text-xs font-semibold text-brand-2 hover:underline"
        >
          Ver mais →
        </button>
      )}
    </div>
  );
}

function ResumoMetric({ value, label, change }: { value: number; label: string; change?: number | null }) {
  const up = change != null && change > 0;
  const down = change != null && change < 0;
  return (
    <div>
      <p className="font-display text-2xl font-extrabold leading-none sm:text-3xl">{fmtK(value)}</p>
      {change != null && (
        <span className={`mt-1 inline-block rounded-full px-1.5 text-[10px] font-semibold ${up ? "bg-brand/15 text-brand-2" : down ? "bg-red-400/15 text-red-500" : "bg-surface-2 text-muted"}`}>
          {up ? "▲" : down ? "▼" : "■"} {Math.abs(change)}%
        </span>
      )}
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

// ================= Seção de abas (como o app do Google) =================
type AbaKey = "visao" | "engaj" | "aval" | "tend" | "pub";

function DesempenhoAbas({ report }: { report: Report }) {
  const [tab, setTab] = useState<AbaKey>("visao");
  const tabs: [AbaKey, string][] = [
    ["visao", "Visão geral"],
    ["engaj", "Engajamento"],
    ["aval", "Avaliações"],
    ["tend", "Tendências de pesquisa"],
    ["pub", "Público-alvo"],
  ];
  return (
    <div id="desempenho-abas" className="scroll-mt-24 rounded-3xl border border-border bg-white p-6 card-soft">
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative shrink-0 px-3 py-3 text-sm font-semibold transition ${tab === k ? "text-brand-2" : "text-muted hover:text-foreground"}`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand-2" />}
          </button>
        ))}
      </div>
      {tab === "visao" && <AbaVisao report={report} />}
      {tab === "engaj" && <AbaEngajamento report={report} />}
      {tab === "aval" && <AbaAvaliacoes report={report} />}
      {tab === "tend" && <AbaTendencias report={report} />}
      {tab === "pub" && <AbaPublico report={report} />}
    </div>
  );
}

function YoYPill({ v }: { v: number | null | undefined }) {
  if (v == null) return null;
  const up = v > 0, down = v < 0;
  return (
    <span className={`ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-brand/15 text-brand-2" : down ? "bg-red-400/15 text-red-500" : "bg-surface-2 text-muted"}`}>
      {up ? "▲" : down ? "▼" : "■"} {Math.abs(v)}% <span className="font-normal">vs. ano anterior</span>
    </span>
  );
}

function AbaRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </li>
  );
}

function AbaVisao({ report }: { report: Report }) {
  const k = report.kpis;
  const searches = (report.keywords ?? []).reduce((s, x) => s + x.value, 0);
  return (
    <ul>
      <AbaRow label="👁️ Visualizações" value={fmtK(k.impressions.current)} />
      <AbaRow label="🤝 Interações" value={k.interactions.current.toLocaleString("pt-BR")} />
      <AbaRow label="🔎 Pesquisas" value={searches.toLocaleString("pt-BR")} />
      <AbaRow label="⭐ Nota · avaliações" value={report.reviews ? `${report.reviews.average.toFixed(1)} · ${report.reviews.total.toLocaleString("pt-BR")}` : "—"} />
    </ul>
  );
}

function MiniLine({ series, labels }: { series: number[]; labels: string[] }) {
  const W = 600, H = 160, P = 10;
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? (W - 2 * P) / (series.length - 1) : 0;
  const pts = series.map((v, i) => `${P + i * step},${H - P - (v / max) * (H - 2 * P)}`).join(" ");
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 160 }}>
        <polyline points={`${P},${H - P} ${pts} ${W - P},${H - P}`} fill="rgba(34,199,184,.12)" stroke="none" />
        <polyline points={pts} fill="none" stroke="#22C7B8" strokeWidth="3" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

function AbaEngajamento({ report }: { report: Report }) {
  const eng = report.engagement;
  const [sel, setSel] = useState("all");
  if (!eng) return <p className="text-sm text-muted">Sem dados de engajamento no período.</p>;
  const CORE = ["calls", "bookings", "directions", "website", "menu"];
  const parts = eng.metrics.filter((m) => m.value > 0 || CORE.includes(m.key));
  const options = [eng.all, ...parts];
  const cur = options.find((o) => o.key === sel) ?? eng.all;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.key === sel;
          return (
            <button
              key={o.key}
              onClick={() => setSel(o.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${on ? "border-brand-2 bg-brand/10 text-brand-2" : "border-border bg-white text-foreground hover:bg-surface-2"}`}
            >
              {on && "✓"} {o.label}
            </button>
          );
        })}
      </div>
      <p className="font-display text-4xl font-extrabold leading-none">{cur.value.toLocaleString("pt-BR")}</p>
      <div className="mt-2"><YoYPill v={cur.changeYoY} /></div>
      <MiniLine series={cur.series} labels={eng.monthLabels} />
      <ul className="mt-4 border-t border-border">
        {options.map((o) => (
          <li key={o.key}>
            <button onClick={() => setSel(o.key)} className={`flex w-full items-center justify-between border-b border-border/60 py-3 text-left last:border-0 ${o.key === sel ? "text-brand-2" : ""}`}>
              <span className="text-sm font-medium">{o.label}</span>
              <span className="text-sm font-semibold">{o.value.toLocaleString("pt-BR")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AbaTendencias({ report }: { report: Report }) {
  const kws = report.keywords ?? [];
  const total = kws.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <p className="text-sm font-semibold">{total.toLocaleString("pt-BR")} pesquisas mostraram seu perfil</p>
      <ul className="mt-3">
        {kws.slice(0, 10).map((kw, i) => (
          <li key={kw.keyword} className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
            <span className="truncate"><span className="mr-2 text-muted">{i + 1}.</span>{kw.keyword}</span>
            <span className="shrink-0 font-medium text-muted">{kw.approx ? "<" : ""}{kw.value.toLocaleString("pt-BR")}</span>
          </li>
        ))}
        {kws.length === 0 && <li className="py-3 text-center text-sm text-muted">Sem termos no período.</li>}
      </ul>
    </div>
  );
}

function AbaPublico({ report }: { report: Report }) {
  const k = report.kpis;
  return (
    <div>
      <p className="text-sm font-semibold">{fmtK(k.impressions.current)} pessoas viram seu perfil <YoYPill v={k.impressions.changeYoY} /></p>
      <p className="mb-2 mt-4 text-sm font-semibold">Dispositivos e plataformas</p>
      {report.sources?.length > 0 ? <SourcesPanel sources={report.sources} /> : <p className="text-sm text-muted">Sem dados no período.</p>}
    </div>
  );
}

function AbaAvaliacoes({ report }: { report: Report }) {
  const r = report.reviews;
  if (!r) return <p className="text-sm text-muted">Sem avaliações no período.</p>;
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-4xl font-extrabold">{r.average ? r.average.toFixed(1) : "—"}</span>
        <span className="text-xl text-amber-500">★</span>
        <span className="text-sm text-muted">{r.total.toLocaleString("pt-BR")} avaliações</span>
      </div>
      <ul className="mt-4">
        <AbaRow label="Novas nesta semana" value={String(r.newThisWeek)} />
        <AbaRow label="Sem avaliação nova há" value={r.daysSinceLast == null ? "—" : `${r.daysSinceLast} dia${r.daysSinceLast === 1 ? "" : "s"}`} />
      </ul>
      <div className="mt-4 rounded-2xl border border-dashed border-brand-2/50 bg-brand/5 p-3 text-xs text-muted">
        🤖 <strong className="text-brand-2">Em breve:</strong> distribuição por estrela (5★/4★…) e resumo com IA do que os clientes elogiam e reclamam.
      </div>
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
