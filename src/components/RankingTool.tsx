"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";
import { GRID_SIZES, gridCredits } from "@/lib/geogrid";
import { rankColor } from "@/components/GridMap";

const GridMap = dynamic(() => import("@/components/GridMap"), { ssr: false });

type LocationOption = { location_name: string; title: string | null };

type Run = {
  id: string | null;
  created_at: string;
  keyword: string;
  grid_size: number;
  spacing_km: number;
  center_lat: number;
  center_lng: number;
  points: { lat: number; lng: number; rank: number | null; row?: number; col?: number;
    top?: { title: string; rank: number; rating: number | null; reviews: number | null; me: boolean }[] }[];
  avg_rank: number | null;
  top3_pct: number | null;
  top10_pct: number | null;
  credits_used: number;
};

const SPACINGS = [
  { km: 0.5, label: "500 m" },
  { km: 1, label: "1 km" },
  { km: 2, label: "2 km" },
  { km: 5, label: "5 km" },
];

export default function RankingTool({
  locations,
  trial,
  credits: initialCredits,
}: {
  locations: LocationOption[];
  trial: boolean;
  credits: number;
}) {
  const active = useActiveProfile();
  const selected = active ?? locations[0]?.location_name ?? "";
  const selectedTitle = locations.find((l) => l.location_name === selected)?.title ?? "perfil";
  const [keyword, setKeyword] = useState("");
  const [grid, setGrid] = useState<number>(7);
  const [spacing, setSpacing] = useState(1);
  const [credits, setCredits] = useState(initialCredits);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<Run[]>([]);

  useEffect(() => {
    if (locations[0]) initActiveProfile(locations[0].location_name);
  }, [locations]);

  const loadHistory = useCallback(async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/ranking?location=${encodeURIComponent(selected)}`);
      const data = await res.json();
      setHistory((data.runs ?? []) as Run[]);
    } catch {
      setHistory([]);
    }
  }, [selected]);

  useEffect(() => {
    setRun(null);
    setError("");
    loadHistory();
  }, [selected, loadHistory]);

  const need = gridCredits(grid);
  const canRun = !running && credits >= need && keyword.trim().length > 0;

  async function analyze() {
    if (!canRun) return;
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selected, keyword: keyword.trim(), grid, spacingKm: spacing }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Não foi possível analisar.");
        if (typeof data.credits === "number") setCredits(data.credits);
        return;
      }
      setRun(data.run as Run);
      setCredits(data.credits ?? credits - need);
      loadHistory();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setRunning(false);
    }
  }

  const center = useMemo(() => (run ? { lat: run.center_lat, lng: run.center_lng } : null), [run]);

  return (
    <div className="space-y-5">
      {/* Saldo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 card-soft">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {selectedTitle}
        </span>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Créditos:</span>
          <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold">{credits.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {trial && (
        <p className="rounded-2xl border border-accent/40 bg-accent/10 p-3 text-sm text-muted">
          🔓 Este recurso faz parte do seu plano. Você pode <strong>ver tudo agora no teste</strong> — os{" "}
          <strong>créditos para rodar as análises são liberados quando você assinar</strong>.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        {/* Controles */}
        <div className="rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="text-sm font-semibold">Nova análise</p>
          <p className="mb-4 text-xs text-muted">Palavra-chave, tamanho da grade e distância entre pontos.</p>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Palavra-chave</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex.: segurança para eventos"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>

          <div className="mt-4">
            <span className="mb-1 block text-xs text-muted">Tamanho da grade (1 crédito por ponto)</span>
            <div className="grid grid-cols-4 gap-2">
              {GRID_SIZES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrid(g)}
                  className={`rounded-xl border px-2 py-2 text-sm transition ${
                    grid === g ? "border-brand bg-brand/10 text-brand-2" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span className="block font-semibold">{g}×{g}</span>
                  <span className="block text-[11px] text-muted">{gridCredits(g)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <span className="mb-1 block text-xs text-muted">Distância entre pontos</span>
            <div className="grid grid-cols-4 gap-2">
              {SPACINGS.map((s) => (
                <button
                  key={s.km}
                  onClick={() => setSpacing(s.km)}
                  className={`rounded-xl border px-2 py-2 text-sm transition ${
                    spacing === s.km ? "border-brand bg-brand/10 text-brand-2" : "border-border hover:bg-surface-2"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Cobre ~{((grid - 1) * spacing).toLocaleString("pt-BR")} km de lado ao redor da empresa.
            </p>
          </div>

          <button
            onClick={analyze}
            disabled={!canRun}
            className="mt-5 w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {running ? `Analisando ${need} pontos…` : `Analisar (${need} créditos)`}
          </button>
          {!canRun && !running && (
            <p className="mt-2 text-center text-xs text-muted">
              {keyword.trim().length === 0
                ? "Digite uma palavra-chave."
                : credits < need
                  ? `Esta grade usa ${need} créditos; você tem ${credits}.`
                  : ""}
            </p>
          )}
          {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
          {running && (
            <p className="mt-2 text-center text-xs text-muted">Pode levar até 1–3 minutos em grades grandes.</p>
          )}
        </div>

        {/* Mapa */}
        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Mapa de ranqueamento{run ? ` · "${run.keyword}"` : ""}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <Legend c={rankColor(1)} t="1–3" />
              <Legend c={rankColor(5)} t="4–10" />
              <Legend c={rankColor(15)} t="11–20" />
              <Legend c={rankColor(null)} t="20+" />
            </div>
          </div>

          {run && center ? (
            <>
              <GridMap points={run.points} center={center} title={selectedTitle} />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Posição média" value={run.avg_rank != null ? run.avg_rank.toLocaleString("pt-BR") : "—"} />
                <Stat label="Top 3" value={`${run.top3_pct ?? 0}%`} color={rankColor(1)} />
                <Stat label="Top 10" value={`${run.top10_pct ?? 0}%`} color={rankColor(5)} />
                <Stat label="Pontos" value={`${run.grid_size}×${run.grid_size}`} />
              </div>

              {/* Concorrentes: quem mais aparece no top dos pontos */}
              <Competitors run={run} myTitle={selectedTitle} />
            </>
          ) : (
            <div className="grid h-[420px] place-items-center rounded-2xl border border-dashed border-border bg-surface-2 text-center text-sm text-muted">
              <div>
                <p className="font-medium text-foreground">Nenhuma análise ainda</p>
                <p className="mt-1">Digite a palavra-chave e clique em Analisar — ou abra uma análise do histórico.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evolução da posição no tempo (mesma palavra-chave) */}
      {run && <Evolution history={history} keyword={run.keyword} />}

      {/* Histórico */}
      {history.length > 0 && (
        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          <p className="mb-3 text-sm font-semibold">Histórico de análises</p>
          <ul className="divide-y divide-border/60">
            {history.map((h) => (
              <li key={h.id ?? h.created_at} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">&ldquo;{h.keyword}&rdquo;</p>
                  <p className="text-xs text-muted">
                    {new Date(h.created_at).toLocaleString("pt-BR")} · {h.grid_size}×{h.grid_size} · {h.spacing_km} km
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">média <strong className="text-foreground">{h.avg_rank ?? "—"}</strong></span>
                  <span className="text-xs text-muted">top3 <strong style={{ color: rankColor(1) }}>{h.top3_pct ?? 0}%</strong></span>
                  <button
                    onClick={() => setRun(h)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2"
                  >
                    Ver mapa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type TopItem = { title: string; rank: number; rating: number | null; reviews: number | null; me: boolean };

function Competitors({ run, myTitle }: { run: Run; myTitle: string }) {
  // Agrega todos os concorrentes que aparecem no top de cada ponto.
  const agg = new Map<string, { title: string; count: number; best: number; sum: number; rating: number | null; reviews: number | null }>();
  let myCount = 0;
  const myName = myTitle.toLowerCase();
  for (const p of run.points) {
    for (const t of (p.top ?? []) as TopItem[]) {
      if (t.me || t.title.toLowerCase() === myName) { myCount++; continue; }
      const k = t.title;
      const cur = agg.get(k) ?? { title: t.title, count: 0, best: 99, sum: 0, rating: t.rating, reviews: t.reviews };
      cur.count++; cur.sum += t.rank; cur.best = Math.min(cur.best, t.rank);
      agg.set(k, cur);
    }
  }
  const rivals = [...agg.values()].sort((a, b) => b.count - a.count || a.sum / a.count - b.sum / b.count).slice(0, 5);
  if (rivals.length === 0) return null;
  const maxCount = Math.max(myCount, ...rivals.map((r) => r.count), 1);
  const Bar = ({ label, count, best, mine, rating, reviews }: { label: string; count: number; best: number; mine?: boolean; rating?: number | null; reviews?: number | null }) => (
    <div className="flex items-center gap-2">
      <span className={`w-40 shrink-0 truncate text-xs ${mine ? "font-bold text-brand-2" : ""}`} title={label}>{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, background: mine ? "#059669" : "#9ca3af" }} />
      </div>
      <span className="w-28 shrink-0 text-right text-[11px] text-muted">{count} pontos · top {best}{rating ? ` · ${rating}★` : ""}</span>
    </div>
  );
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-2/50 p-4">
      <p className="mb-3 text-sm font-semibold">Você × concorrentes (nesta palavra-chave)</p>
      <div className="space-y-2">
        <Bar label={`${myTitle} (você)`} count={myCount} best={run.avg_rank != null ? Math.round(run.avg_rank) : 20} mine rating={run.points[0]?.top?.find((t) => t.me)?.rating} />
        {rivals.map((r) => <Bar key={r.title} label={r.title} count={r.count} best={r.best} rating={r.rating} reviews={r.reviews} />)}
      </div>
      <p className="mt-2 text-[11px] text-muted">Quantos pontos da grade cada um aparece no topo. Quem aparece em mais pontos domina a região.</p>
    </div>
  );
}

function Evolution({ history, keyword }: { history: Run[]; keyword: string }) {
  const runs = history.filter((h) => h.keyword === keyword && h.avg_rank != null).slice(0, 12).reverse();
  if (runs.length < 2) return null;
  const vals = runs.map((r) => r.avg_rank as number);
  const min = Math.min(...vals), max = Math.max(...vals);
  const W = 560, H = 120, pad = 24;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (runs.length - 1);
  // menor posição = melhor, então invertemos o eixo Y
  const y = (v: number) => { const r = max === min ? 0.5 : (v - min) / (max - min); return pad + r * (H - 2 * pad); };
  const path = runs.map((r, i) => `${i ? "L" : "M"} ${x(i)} ${y(r.avg_rank as number)}`).join(" ");
  const first = vals[0], last = vals[vals.length - 1];
  const improved = last < first; // posição menor = melhor
  return (
    <div className="rounded-3xl border border-border bg-white p-5 card-soft">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Evolução da posição · &ldquo;{keyword}&rdquo;</p>
        <span className={`text-xs font-semibold ${improved ? "text-emerald-600" : last > first ? "text-red-500" : "text-muted"}`}>
          {improved ? "▲ melhorou" : last > first ? "▼ piorou" : "estável"} ({first} → {last})
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" />
        {runs.map((r, i) => <circle key={i} cx={x(i)} cy={y(r.avg_rank as number)} r="3.5" fill="#059669" />)}
      </svg>
      <p className="text-[11px] text-muted">Posição média ao longo das análises (mais baixo = melhor). Rode análises periódicas para acompanhar.</p>
    </div>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {t}
    </span>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-center">
      <p className="text-lg font-bold leading-none" style={color ? { color } : undefined}>{value}</p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}
