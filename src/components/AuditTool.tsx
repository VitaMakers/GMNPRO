"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { AuditReport, CheckResult, PlaceData } from "@/lib/audit";

const LocationsMap = dynamic(() => import("@/components/LocationsMap"), { ssr: false });

interface Candidate {
  placeId: string;
  name: string;
  address: string;
}

export default function AuditTool() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [fromExtension, setFromExtension] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);

  // Resultado vindo da extensão do Chrome (?scan=<id>).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("scan");
    if (!id) return;
    setScanId(id);
    fetch(`/api/extension/scan?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => { if (d.report) { setReport(d.report as AuditReport); setFromExtension(true); } })
      .catch(() => undefined);
    window.history.replaceState({}, "", "/auditoria");
  }, []);

  async function handleSearch() {
    setError("");
    setNotConfigured(false);
    setReport(null);
    setCandidates([]);
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?q=${encodeURIComponent(query)}`);
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Não foi possível buscar agora.");
        return;
      }
      if (!data.results?.length) {
        setError("Nenhuma empresa encontrada. Tente o nome com a cidade.");
        return;
      }
      setCandidates(data.results);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function runAudit(placeId: string) {
    setError("");
    setLoading(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/audit?placeId=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Não foi possível auditar agora.");
        return;
      }
      setReport(data.report);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  const extUrl = process.env.NEXT_PUBLIC_EXTENSION_URL;
  return (
    <div className="space-y-6">
      {/* Extensão opcional para dados ainda mais profundos */}
      <div className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-2">🧩</span>
          <div>
            <p className="text-sm font-semibold">Quer dados ainda mais profundos?</p>
            <p className="text-xs text-muted">
              Instale a extensão do Chrome (opcional) para a Pré-análise ler também posts, perguntas e
              respostas e atributos direto da página do Google — o máximo de precisão.
            </p>
          </div>
        </div>
        <a href={extUrl || "/extensao"} target={extUrl ? "_blank" : undefined} rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:opacity-90">
          Instalar extensão
        </a>
      </div>

      {!report && (
        <div className="rounded-3xl border border-border bg-white card-soft p-5">
          <label className="mb-2 block text-sm font-medium">Nome da empresa</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex.: Clínica Sorriso Londrina"
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Analisar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Use o nome com a cidade se houver nomes parecidos.
          </p>
        </div>
      )}

      {notConfigured && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-medium text-accent">Chave da Google Places API não configurada.</p>
          <p className="mt-1 text-muted">
            Adicione a variável <code className="rounded bg-surface-2 px-1">GOOGLE_PLACES_API_KEY</code> no
            ambiente para ativar a auditoria com dados reais.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">Escolha o local certo:</p>
          {candidates.map((c) => (
            <button
              key={c.placeId}
              onClick={() => runAudit(c.placeId)}
              className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm transition hover:border-brand/50"
            >
              <span className="block font-medium">{c.name}</span>
              <span className="text-xs text-muted">{c.address}</span>
            </button>
          ))}
        </div>
      )}

      {report && fromExtension && (
        <div className="space-y-2">
          <div className="rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs text-brand-2">
            🧩 Pré-análise profunda via extensão do Chrome — inclui posts, perguntas/respostas e atributos.
          </div>
          {report.confirmed ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <span>✓</span> Dados confirmados pela API oficial do Google (Maps) — garantia de assertividade.
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ Dados lidos do painel. Para confirmação total, abra a empresa no <strong>Google Maps</strong> e analise por lá.
            </div>
          )}
        </div>
      )}
      {report && <Report report={report} scanId={scanId} onReset={() => { setReport(null); setQuery(""); setFromExtension(false); }} />}
    </div>
  );
}

function Report({ report, onReset, scanId }: { report: AuditReport; onReset: () => void; scanId: string | null }) {
  const color =
    report.score >= 75 ? "text-brand-2" : report.score >= 50 ? "text-accent" : "text-red-400";
  const ring =
    report.score >= 75 ? "#34a853" : report.score >= 50 ? "#fbbc05" : "#f87171";

  const p = report.place;
  const hasCoords = typeof p.lat === "number" && typeof p.lng === "number";
  const label = report.score >= 75 ? "Bom" : report.score >= 50 ? "Razoável" : "Fraco";

  return (
    <div className="space-y-6">
      {/* Mapa + card detalhado do perfil (pré-análise) */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-border bg-white card-soft">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <p className="text-sm font-semibold">Localização</p>
            <span className="text-xs text-muted">Pré-análise · dados públicos do Google</span>
          </div>
          <div className="p-3">
            {hasCoords ? (
              <LocationsMap points={[{ title: p.name, lat: p.lat!, lng: p.lng!, active: true, detail: "Empresa analisada" }]} />
            ) : (
              <div className="grid h-full min-h-[280px] place-items-center rounded-2xl border border-dashed border-border bg-surface-2 text-sm text-muted">
                Sem coordenadas públicas para este local.
              </div>
            )}
          </div>
        </div>

        <PlaceCard place={p} score={report.score} scoreColor={color} ring={ring} label={label} />
      </div>

      {/* Termômetro + pontuação detalhada */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col items-center rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="font-display text-lg font-bold">Pontuação Geral</p>
          <p className="text-xs text-muted">Desempenho do perfil</p>
          <Gauge value={report.score} />
          <p className="-mt-2 text-4xl font-bold" style={{ color: ring }}>{report.score}</p>
          <span className="mt-2 rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-wide" style={{ borderColor: `${ring}66`, background: `${ring}14`, color: ring }}>{label}</span>
        </div>
        <div className="rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="mb-4 text-center font-display text-lg font-bold">Pontuação Detalhada</p>
          <ul className="space-y-3">
            {[
              { n: report.checks.filter((c) => c.status === "fail").length, label: "Fraco", sub: "Métricas que precisam de atenção", c: "#dc2626" },
              { n: report.checks.filter((c) => c.status === "warn").length, label: "Razoável", sub: "Métricas com potencial de melhoria", c: "#d97706" },
              { n: report.checks.filter((c) => c.status === "ok").length, label: "Bom", sub: "Métricas em excelente estado", c: "#059669" },
            ].map((r) => (
              <li key={r.label} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold text-white shadow" style={{ background: r.c }}>{r.n}</span>
                <span><span className="block text-sm font-semibold">{r.label}</span><span className="block text-xs text-muted">{r.sub}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Concorrentes e segmento (raio de 3 km) — como o GBP */}
      {report.competitors && <Competitors c={report.competitors} scanId={scanId} />}

      {report.priorities.length > 0 && (
        <div className="rounded-3xl border border-border bg-white card-soft p-5">
          <h3 className="mb-3 font-semibold">O que melhorar primeiro</h3>
          <ol className="space-y-2">
            {report.priorities.slice(0, 5).map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="font-semibold text-brand">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-white card-soft p-5">
        <h3 className="mb-3 font-semibold">Checklist completo</h3>
        <div className="space-y-2">
          {report.checks.map((c) => (
            <CheckRow key={c.key} c={c} />
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:bg-surface"
      >
        ← Analisar outra empresa
      </button>
    </div>
  );
}

function Competitors({ c: initial, scanId }: { c: NonNullable<AuditReport["competitors"]>; scanId: string | null }) {
  const [c, setC] = useState(initial);
  const [kw, setKw] = useState(initial.keyword ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function update() {
    if (!scanId || !kw.trim()) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/extension/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanId, keyword: kw.trim() }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.detail ?? d.error ?? "Não foi possível atualizar."); return; }
      setC(d.competitors);
    } finally { setBusy(false); }
  }
  const points = c.list.filter((x) => x.lat).map((x) => ({ title: x.name, lat: x.lat, lng: x.lng, active: !!x.isMe, detail: `#${x.rank} no Maps` }));
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-white p-6 card-soft">
        <h3 className="font-display text-lg font-bold">Ranking no Google Maps · quem aparece primeiro</h3>
        <p className="mt-1 text-sm text-muted">Posição real de ranqueamento no Google/Maps para o nicho buscado — e quem está pagando anúncio.</p>
        {scanId && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Nicho / busca:</span>
            <input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && update()}
              placeholder="ex.: buffet para casamentos em Sorocaba"
              className="min-w-[240px] flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
            <button onClick={update} disabled={busy || !kw.trim()} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? "Buscando…" : "Atualizar ranking"}
            </button>
            {err && <span className="w-full text-xs text-red-500">{err}</span>}
          </div>
        )}

        <p className="mt-4 text-sm">
          {c.myRank
            ? <>A empresa aparece em <strong className={c.myRank <= 3 ? "text-emerald-600" : c.myRank <= 10 ? "text-amber-600" : "text-red-500"}>{c.myRank}º lugar</strong> no Google Maps para &ldquo;{c.keyword}&rdquo;.</>
            : <>A empresa <strong className="text-red-500">não aparece no top {c.total}</strong> do Google Maps para &ldquo;{c.keyword}&rdquo;.</>}
          {c.segmentAvg != null && <> Nota média dos primeiros colocados: <strong>{c.segmentAvg}★</strong>.</>}
        </p>

        {(() => {
          const paid = c.list.filter((x) => x.isPaid);
          const organic = c.list.filter((x) => !x.isPaid).slice(0, 5);
          const me = c.list.find((x) => x.isMe);
          const leader = organic.find((x) => !x.isMe) ?? organic[0];
          const cmp = (mine?: number, other?: number) => (mine ?? 0) >= (other ?? 0);
          return (
            <>
              {/* Comparativo Você × 1º colocado */}
              {me && leader && leader.name !== me.name && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                  <div className="grid grid-cols-2 bg-surface-2 text-center text-xs font-semibold">
                    <div className="border-r border-border p-2 text-emerald-700">⭐ Você</div>
                    <div className="p-2">🏆 1º colocado</div>
                  </div>
                  <div className="grid grid-cols-2 text-center">
                    <div className="border-r border-border p-3"><p className="truncate text-sm font-medium">{me.name}</p></div>
                    <div className="p-3"><p className="truncate text-sm font-medium">{leader.name}</p></div>
                  </div>
                  {[
                    { label: "Posição no Maps", mine: `${c.myRank ?? "—"}º`, other: "1º", better: (c.myRank ?? 99) <= 1 },
                    { label: "Nota", mine: me.rating ? `${me.rating}★` : "—", other: leader.rating ? `${leader.rating}★` : "—", better: cmp(me.rating, leader.rating) },
                    { label: "Avaliações", mine: me.reviewCount.toLocaleString("pt-BR"), other: leader.reviewCount.toLocaleString("pt-BR"), better: cmp(me.reviewCount, leader.reviewCount) },
                  ].map((r) => (
                    <div key={r.label} className="grid grid-cols-2 border-t border-border text-center text-sm">
                      <div className={`border-r border-border p-2 ${r.better ? "font-bold text-emerald-700" : ""}`}>{r.mine}</div>
                      <div className={`p-2 ${!r.better ? "font-bold" : ""}`}>{r.other}</div>
                    </div>
                  ))}
                  <p className="border-t border-border bg-surface-2 p-2 text-center text-[11px] text-muted">{r_label(me, leader, c.myRank)}</p>
                </div>
              )}

              {/* Patrocinados */}
              {paid.length > 0 && (
                <>
                  <p className="mb-2 mt-5 text-sm font-semibold">💳 Patrocinados (Google Ads)</p>
                  <ul className="space-y-2">{paid.map((x) => <CompRow key={"p" + x.rank + x.name} x={x} showRank={false} />)}</ul>
                </>
              )}

              {/* Orgânicos */}
              <p className="mb-2 mt-5 text-sm font-semibold">🌱 Resultados orgânicos (top 5)</p>
              <ul className="space-y-2">{organic.map((x, i) => <CompRow key={"o" + x.rank + x.name} x={x} pos={i + 1} showRank />)}</ul>
            </>
          );
        })()}

        <div className="mt-4 rounded-xl border border-border/60 bg-surface-2 p-3 text-xs text-muted">
          <strong className="text-foreground">Por que esses aparecem primeiro?</strong> O Google ranqueia por <strong>relevância</strong> (nome/categoria/palavra-chave), <strong>distância</strong> de quem busca e <strong>proeminência</strong> (nota, volume de avaliações, atividade do perfil). Quem está marcado como <strong>ANÚNCIO</strong> pagou para aparecer no topo (não é ranqueamento orgânico).
        </div>
      </div>

      {points.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-border bg-white card-soft">
          <div className="border-b border-border/60 px-5 py-3"><p className="text-sm font-semibold">Mapa dos primeiros colocados (verde = a empresa)</p></div>
          <div className="p-3"><LocationsMap points={points} height={320} /></div>
        </div>
      )}
    </div>
  );
}

type CompItem = NonNullable<AuditReport["competitors"]>["list"][number];

function r_label(me: CompItem, leader: CompItem, myRank: number | null): string {
  if (myRank === 1) return "Você já é o 1º colocado orgânico neste nicho. 🎉 Mantenha avaliações e postagens em dia.";
  const gaps: string[] = [];
  if ((leader.reviewCount ?? 0) > (me.reviewCount ?? 0)) gaps.push(`${(leader.reviewCount - me.reviewCount).toLocaleString("pt-BR")} avaliações a mais`);
  if ((leader.rating ?? 0) > (me.rating ?? 0)) gaps.push("nota maior");
  return gaps.length ? `Para passar o 1º colocado, foque em: ${gaps.join(" e ")}.` : "Você está muito perto do 1º colocado — constância de avaliações e postagens decide.";
}

function CompRow({ x, pos, showRank }: { x: CompItem; pos?: number; showRank?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl border p-3 ${x.isMe ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200" : "border-border/70 bg-white"}`}>
      {showRank && <span className="w-6 shrink-0 text-center text-lg font-bold text-foreground">{pos ?? x.rank}</span>}
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2">
        {x.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={x.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-muted">{(x.name || "?").slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`truncate text-sm font-semibold ${x.isMe ? "text-emerald-700" : ""}`}>{x.isMe ? "⭐ " : ""}{x.name}</span>
          {x.isPaid && <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">ANÚNCIO</span>}
          {x.isMe && <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">VOCÊ</span>}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {x.rating ? <span className="font-semibold text-amber-600">{x.rating}★</span> : null}
          {x.reviewCount ? <span>{x.reviewCount.toLocaleString("pt-BR")} avaliações</span> : null}
          {x.category ? <span>· {x.category}</span> : null}
          {x.openNow != null && <span className={x.openNow ? "text-emerald-600" : "text-red-500"}>· {x.openNow ? "Aberto" : "Fechado"}</span>}
        </span>
        {x.snippet && <span className="mt-0.5 line-clamp-2 block text-[11px] italic text-muted">&ldquo;{x.snippet}&rdquo;</span>}
      </span>
    </li>
  );
}

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = -90 + (v / 100) * 180;
  const arc = (from: number, to: number, color: string) => {
    const r = 70, cx = 100, cy = 100;
    const a0 = (Math.PI * (180 + from * 1.8)) / 180;
    const a1 = (Math.PI * (180 + to * 1.8)) / 180;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`} stroke={color} strokeWidth="22" fill="none" />;
  };
  return (
    <svg viewBox="0 0 200 115" className="mt-3 w-full max-w-[260px]">
      {arc(0, 50, "#dc2626")}{arc(50, 75, "#f59e0b")}{arc(75, 100, "#059669")}
      <g transform={`rotate(${angle} 100 100)`}><path d="M 100 100 L 96 100 L 100 38 L 104 100 Z" fill="#1f2937" /></g>
      <circle cx="100" cy="100" r="8" fill="#1f2937" /><circle cx="100" cy="100" r="3.5" fill="#fff" />
    </svg>
  );
}

function PlaceCard({
  place,
  score,
  scoreColor,
  ring,
  label,
}: {
  place: PlaceData;
  score: number;
  scoreColor: string;
  ring: string;
  label: string;
}) {
  const operational = place.businessStatus === "OPERATIONAL" || !place.businessStatus;
  const photoSrc = place.photoUrl
    ? place.photoUrl
    : place.photoName
      ? `/api/audit/photo?name=${encodeURIComponent(place.photoName)}`
      : null;
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white card-soft">
      <div className="h-24 w-full overflow-hidden bg-gradient-to-r from-brand/15 to-brand-2/15">
        {photoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="relative px-5 pb-5">
        <span className="absolute -top-7 left-5 grid h-14 w-14 place-items-center overflow-hidden rounded-full border-4 border-white bg-surface-2 shadow">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <GoogleG className="h-6 w-6" />
          )}
        </span>
        {/* Nota */}
        <div className="flex justify-end pt-3">
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${ring}1a`, color: ring }}>
            Nota {score} · {label}
          </span>
        </div>

        <p className="mt-1 font-display text-lg font-bold leading-tight tracking-tight">{place.name}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          {typeof place.rating === "number" && place.rating > 0 && (
            <>
              <span className="font-semibold">{place.rating.toFixed(1)}</span>
              <Stars rating={place.rating} />
              {place.reviewCount ? <span className="text-muted">({place.reviewCount} avaliações)</span> : null}
            </>
          )}
          {place.priceLevel && <span className="text-muted">· {place.priceLevel}</span>}
        </div>

        {place.primaryType && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted"><IconTag /> {place.primaryType}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${operational ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {operational ? "Ativo" : "Fechado permanentemente"}
          </span>
          {place.openNow != null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${place.openNow ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {place.openNow ? "Aberto agora" : "Fechado agora"}
            </span>
          )}
        </div>

        {/* Botões */}
        <div className="mt-3 flex flex-wrap gap-2">
          {place.searchUri && (
            <a href={place.searchUri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-surface-2">
              <GoogleG className="h-4 w-4" /> Ver na Pesquisa
            </a>
          )}
          {place.googleMapsUri && (
            <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-surface-2">
              <span className="text-brand-2"><IconPin /></span> Ver no Maps
            </a>
          )}
        </div>

        {/* Dados */}
        <div className="mt-3 space-y-1.5 text-sm">
          {place.address && <InfoRow icon={<IconPin />} text={place.address} />}
          {place.phone && <InfoRow icon={<IconPhone />} text={place.phone} />}
          {place.website && (
            <InfoRow icon={<IconGlobe />} text={<a href={place.website} target="_blank" rel="noopener noreferrer" className="truncate text-brand-2 hover:underline">{place.website.replace(/^https?:\/\//, "")}</a>} />
          )}
        </div>

        {/* Horários */}
        {place.weekdayDescriptions && place.weekdayDescriptions.length > 0 && (
          <details className="mt-3 rounded-xl border border-border/60 bg-surface-2 p-3">
            <summary className="cursor-pointer text-xs font-medium">Horário de funcionamento</summary>
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {place.weekdayDescriptions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </details>
        )}

        {/* Mini-stats */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="Fotos públicas" value={place.photoCount ?? 0} />
          <MiniStat label="Avaliações" value={place.reviewCount ?? 0} />
        </div>

        {place.description && (
          <div className="mt-3 rounded-xl border border-border/60 bg-surface-2 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Resumo do Google</p>
            <p className="mt-1 text-xs text-foreground/80">{place.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" fill={i < full ? "#fbbc05" : i === full && half ? "url(#half2)" : "#dadce0"}>
          <defs><linearGradient id="half2"><stop offset="50%" stopColor="#fbbc05" /><stop offset="50%" stopColor="#dadce0" /></linearGradient></defs>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

function InfoRow({ icon, text }: { icon: ReactNode; text: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-muted">
      <span className="mt-0.5 shrink-0 text-brand-2">{icon}</span>
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-center">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.9 45 31 45 24z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8 40.9 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5C3 17.1 2 20.4 2 24s1 6.9 2.5 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 8 7.1 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  );
}

const ico2 = "h-4 w-4";
function IconPin() { return <svg viewBox="0 0 24 24" className={ico2} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function IconPhone() { return <svg viewBox="0 0 24 24" className={ico2} fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" /></svg>; }
function IconGlobe() { return <svg viewBox="0 0 24 24" className={ico2} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>; }
function IconTag() { return <svg viewBox="0 0 24 24" className={ico2} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7-7A2 2 0 013 12.2V5a2 2 0 012-2h7.2a2 2 0 011.4.6l7 7a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></svg>; }

function Thermometer({ status }: { status: "ok" | "warn" | "fail" }) {
  // Marcador na faixa Fraco/Razoável/Bom conforme o status (igual ao GBP).
  const pos = status === "fail" ? 16 : status === "warn" ? 50 : 84; // % da barra
  return (
    <div className="relative mt-2 w-full max-w-[280px]">
      <div className="absolute -top-2 -translate-x-1/2 text-[10px]" style={{ left: `${pos}%` }}>▼</div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        <span className="h-full" style={{ width: "40%", background: "#dc2626" }} />
        <span className="h-full" style={{ width: "30%", background: "#f59e0b" }} />
        <span className="h-full" style={{ width: "30%", background: "#059669" }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-muted"><span>Fraco</span><span>Razoável</span><span>Bom</span></div>
    </div>
  );
}

function CheckRow({ c }: { c: CheckResult }) {
  const icon = c.status === "ok" ? "✓" : c.status === "warn" ? "!" : "✕";
  const cls =
    c.status === "ok" ? "bg-brand-2 text-white" : c.status === "warn" ? "bg-accent text-black" : "bg-red-400 text-white";
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${cls}`}>
        {icon}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{c.label}</span>
          <span className="text-xs text-muted">{c.points}/{c.maxPoints}</span>
        </div>
        <p className="text-xs text-muted">{c.detail}</p>
        <Thermometer status={c.status} />
        {c.status !== "ok" && <p className="mt-1.5 text-xs text-brand">{c.tip}</p>}
      </div>
    </div>
  );
}
