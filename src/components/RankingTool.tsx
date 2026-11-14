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
  const [schedFreq, setSchedFreq] = useState<string | null>(null);
  const [schedBusy, setSchedBusy] = useState(false);

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
    fetch(`/api/ranking/schedule?location=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((d) => {
        const s = (d.schedules ?? []).find((x: { enabled: boolean; frequency: string }) => x.enabled);
        setSchedFreq(s ? s.frequency : null);
      })
      .catch(() => undefined);
  }, [selected, loadHistory]);

  async function schedule(frequency: string | null) {
    if (!run) return;
    // Acompanhamento usa no máximo grade 7x7 para proteger o saldo.
    const schedGrid = Math.min(run.grid_size, 7);
    if (frequency) {
      const perRun = schedGrid * schedGrid;
      const perMonth = frequency === "weekly" ? perRun * 4 : perRun;
      const ok = window.confirm(
        `Acompanhamento ${frequency === "weekly" ? "semanal" : "mensal"} em grade ${schedGrid}×${schedGrid}.\n` +
        `Cada rodada usa ${perRun} créditos (~${perMonth}/mês).\n` +
        `Só roda em plano pago e com saldo; para sozinho quando acaba. Confirmar?`,
      );
      if (!ok) return;
    }
    setSchedBusy(true);
    try {
      await fetch("/api/ranking/schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selected, keyword: run.keyword, grid: schedGrid, spacingKm: run.spacing_km,
          frequency: frequency ?? "weekly", enabled: frequency !== null,
        }),
      });
      setSchedFreq(frequency);
    } finally {
      setSchedBusy(false);
    }
  }

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
      <details className="rounded-2xl border border-border bg-white p-4 text-sm card-soft">
        <summary className="cursor-pointer font-semibold">Como funciona o Mapa de Ranqueamento?</summary>
        <div className="mt-3 space-y-2 text-muted">
          <p>Dividimos a região ao redor da empresa numa <strong>grade de pontos</strong>. Em <strong>cada ponto</strong>, consultamos o Google Maps como se alguém estivesse buscando ali e anotamos <strong>em que posição</strong> a empresa aparece para a palavra-chave.</p>
          <p><span className="font-semibold text-emerald-600">Verde (1–3)</span> = aparece no topo · <span className="font-semibold text-amber-600">amarelo (4–10)</span> · <span className="font-semibold text-red-500">vermelho (11–20)</span> · <span className="font-semibold text-gray-500">cinza (20+)</span> = não aparece no top 20 ali.</p>
          <p><strong>Posição média / Top 3 / Top 10</strong> resumem o desempenho na região. <strong>Você × concorrentes</strong> mostra quem domina mais pontos.</p>
          <p>Os dados são <strong>reais do Google Maps</strong> (via DataForSEO), posição por posição. Cada ponto = 1 crédito.</p>
        </div>
      </details>

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

              {/* Diagnóstico e o que fazer */}
              <Diagnosis run={run} />

              {/* Acompanhamento automático */}
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-2/50 p-3">
                <span className="text-sm font-medium">Acompanhar automaticamente:</span>
                {(["weekly", "monthly"] as const).map((f) => (
                  <button key={f} onClick={() => schedule(f)} disabled={schedBusy}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${schedFreq === f ? "border-brand bg-brand text-white" : "border-border hover:bg-surface-2"}`}>
                    {f === "weekly" ? "Semanal" : "Mensal"}
                  </button>
                ))}
                {schedFreq && (
                  <button onClick={() => schedule(null)} disabled={schedBusy} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-60">
                    Desligar
                  </button>
                )}
                <span className="text-[11px] text-muted">{schedFreq ? `Ativo (${schedFreq === "weekly" ? "toda semana" : "todo mês"}) — usa ${Math.min(run.grid_size, 7) ** 2} créditos por rodada (grade até 7×7).` : "Acompanhamento usa grade até 7×7 para proteger o saldo. Só roda em plano pago com crédito."}</span>
              </div>
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

function Diagnosis({ run }: { run: Run }) {
  const pts = run.points;
  const n = pts.length || 1;
  const found = pts.filter((p) => p.rank != null);
  const top3 = pts.filter((p) => p.rank != null && (p.rank as number) <= 3).length;
  const beyond = pts.filter((p) => p.rank == null).length;
  const size = run.grid_size;
  const c = (size - 1) / 2;

  // Direção mais fraca (menor % de aparição). row 0 = norte, col 0 = oeste.
  const dir = { norte: [0, 0], sul: [0, 0], leste: [0, 0], oeste: [0, 0] } as Record<string, [number, number]>;
  for (const p of pts) {
    const r = p.row ?? 0, col = p.col ?? 0, ok = p.rank != null ? 1 : 0;
    if (r < c) { dir.norte[0] += ok; dir.norte[1]++; }
    if (r > c) { dir.sul[0] += ok; dir.sul[1]++; }
    if (col > c) { dir.leste[0] += ok; dir.leste[1]++; }
    if (col < c) { dir.oeste[0] += ok; dir.oeste[1]++; }
  }
  const dirPct = Object.entries(dir).map(([k, v]) => ({ k, pct: v[1] ? Math.round((v[0] / v[1]) * 100) : 100 }));
  const weak = dirPct.sort((a, b) => a.pct - b.pct)[0];

  // Concorrentes que mais dominam.
  const agg = new Map<string, number>();
  for (const p of pts) for (const t of (p.top ?? [])) if (!t.me && t.rank <= 3) agg.set(t.title, (agg.get(t.title) ?? 0) + 1);
  const rivals = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);

  const recs: string[] = [];
  if (top3 / n < 0.5) recs.push("Aumente a proeminência: peça avaliações toda semana (com link/QR no pós-venda), responda todas e poste novidades semanalmente — é o que mais sobe posição.");
  if (beyond / n > 0.3) recs.push(`Você some (20+) em boa parte da região, principalmente ao ${weak.k}. Como distância pesa, reforce relevância e autoridade: inclua a palavra-chave na descrição e nos serviços, confirme a categoria principal certa e adicione categorias secundárias.`);
  recs.push(`Trabalhe os bairros a ${weak.k} (onde está mais fraco): consiga avaliações de clientes dessas regiões citando o bairro e, se você atende no local do cliente, cadastre a área de atendimento no perfil.`);
  if (rivals.length) recs.push(`Quem domina a região: ${rivals.join(", ")}. Veja o que eles têm a mais (nº de avaliações, fotos, posts) e supere no volume e na constância.`);
  recs.push("Construa menções locais (site, redes, listas e parceiros citando nome + endereço + bairros) — ajuda o Google a entender seu alcance e melhora o ranqueamento nas bordas.");

  return (
    <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
      <p className="text-sm font-semibold">🩺 Diagnóstico — como melhorar as regiões fracas</p>
      <p className="mt-1 text-xs text-muted">
        Você aparece no top 3 em <strong>{Math.round((top3 / n) * 100)}%</strong> da região e some (20+) em <strong>{Math.round((beyond / n) * 100)}%</strong>. Região mais fraca: <strong>ao {weak.k}</strong>.
      </p>
      <ol className="mt-3 space-y-2">
        {recs.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="font-semibold text-brand-2">{i + 1}.</span>
            <span className="text-foreground/90">{r}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-border/50 pt-2 text-[11px] text-muted">
        Por que você fica 20+ nos pontos distantes: o Google pesa muito a <strong>distância</strong> de quem busca. Você não muda o endereço, mas melhora <strong>relevância</strong> (palavra-chave/categorias) e <strong>proeminência</strong> (avaliações, posts, autoridade) — é isso que amplia seu raio.
      </p>
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
