"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Loc = { location_name: string; title: string | null };
type Branding = { name?: string; logo_url?: string; color?: string; phone?: string; site?: string } | null;

interface Strength { score: number | null; fraco: number; razoavel: number; bom: number; title?: string }
interface Kpi { current: number; change?: number | null; changeYoY?: number | null }
interface EngMetric { key: string; label: string; value: number }
interface Perf {
  range?: { start: string; end: string };
  periodDays?: number;
  kpis?: { impressions: Kpi; interactions: Kpi; website: Kpi; calls: Kpi; directions: Kpi; conversations: Kpi };
  engagement?: { metrics: EngMetric[] };
  sources?: { label: string; value: number }[];
  keywords?: { keyword: string; value: number; approx: boolean }[];
  searches?: { total: number; changeYoY: number | null };
  reviews?: { average: number; total: number } | null;
}
interface Stars { average: number; total: number; sampled: number; counts: { stars: number; count: number }[] }
interface AI { summary: string; praises: string[]; complaints: string[] }
interface RankRun { keyword: string; grid_size: number; avg_rank: number | null; top3_pct: number | null; top10_pct: number | null; points?: unknown }

const MES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const fmtK = (n: number) =>
  n >= 1_000_000 ? (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi" : n >= 1000 ? (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : n.toLocaleString("pt-BR");

type SecKey = "forca" | "desemp" | "aval" | "ia" | "rank";
const SECTIONS: { key: SecKey; label: string; subs: { key: string; label: string }[] }[] = [
  { key: "forca", label: "💪 Força do perfil", subs: [
    { key: "anel", label: "Nota (anel %)" },
    { key: "resumo", label: "Resumo (bons / a melhorar / faltando)" },
  ] },
  { key: "desemp", label: "📊 Desempenho", subs: [
    { key: "views", label: "Visualizações" },
    { key: "inter", label: "Interações" },
    { key: "pesq", label: "Pesquisas" },
    { key: "acoes", label: "Ações dos clientes" },
    { key: "origem", label: "De onde vêm" },
    { key: "termos", label: "Termos de pesquisa" },
  ] },
  { key: "aval", label: "⭐ Avaliações", subs: [
    { key: "nota", label: "Nota + total" },
    { key: "dist", label: "Distribuição por estrela" },
  ] },
  { key: "ia", label: "🤖 Resumo com IA", subs: [
    { key: "resumo", label: "Parágrafo-resumo" },
    { key: "elogios", label: "Elogios" },
    { key: "atencao", label: "Pontos de atenção" },
  ] },
  { key: "rank", label: "🗺️ Ranking no Maps", subs: [
    { key: "mapa", label: "Mapa (grade)" },
    { key: "metricas", label: "Posição / top 3 / top 10" },
  ] },
];
// Todas as sub-opções ligadas por padrão.
const ALL_SUBS: Record<string, boolean> = {};
SECTIONS.forEach((s) => s.subs.forEach((x) => { ALL_SUBS[`${s.key}.${x.key}`] = true; }));

export default function RelatorioBuilder({ locations, initialBranding }: { locations: Loc[]; initialBranding: Branding }) {
  const [loc, setLoc] = useState(locations[0]?.location_name ?? "");
  const activeTitle = locations.find((l) => l.location_name === loc)?.title ?? "seu perfil";

  // Período do Desempenho
  const _now = new Date();
  const _defEnd = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}`;
  const _six = new Date(_now.getFullYear(), _now.getMonth() - 5, 1);
  const _defStart = `${_six.getFullYear()}-${String(_six.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState<"30" | "60" | "90" | "180" | "custom">("180");
  const [cStart, setCStart] = useState(_defStart);
  const [cEnd, setCEnd] = useState(_defEnd);

  // Marca
  const [name, setName] = useState(initialBranding?.name ?? "");
  const [color, setColor] = useState(initialBranding?.color ?? "#22C7B8");
  const [phone, setPhone] = useState(initialBranding?.phone ?? "");
  const [site, setSite] = useState(initialBranding?.site ?? "");
  const [logoUrl, setLogoUrl] = useState(initialBranding?.logo_url ?? "");
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandMsg, setBrandMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seções
  const [sec, setSec] = useState<Record<SecKey, boolean>>({ forca: true, desemp: true, aval: true, ia: true, rank: true });
  const [sub, setSub] = useState<Record<string, boolean>>({ ...ALL_SUBS });
  const [expanded, setExpanded] = useState<SecKey | null>(null);
  const sOn = (s: SecKey, k: string) => sec[s] && (sub[`${s}.${k}`] ?? true);

  // Dados
  const [strength, setStrength] = useState<Strength | null>(null);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [stars, setStars] = useState<Stars | null>(null);
  const [ai, setAi] = useState<AI | null>(null);
  const [rank, setRank] = useState<RankRun | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!loc) return;
    setLoading(true);
    const pad = (x: number) => String(x).padStart(2, "0");
    let pfQs = "";
    if (period === "180") {
      const s = new Date(_now.getFullYear(), _now.getMonth() - 5, 1);
      const start = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-01`;
      const end = `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-${pad(_now.getDate())}`;
      pfQs = `&start=${start}&end=${end}`;
    } else if (period === "custom") {
      const [sy, sm] = cStart.split("-").map(Number);
      const [ey, em] = cEnd.split("-").map(Number);
      const start = `${sy}-${pad(sm)}-01`;
      const lastDay = new Date(Date.UTC(ey, em, 0)).getUTCDate();
      const end = `${ey}-${pad(em)}-${pad(lastDay)}`;
      pfQs = `&start=${start}&end=${end}`;
    } else {
      pfQs = `&period=${period}`; // 30 / 60 / 90 dias
    }
    const q = encodeURIComponent(loc);
    const [st, pf, sc, ia2, rk] = await Promise.all([
      fetch(`/api/google/profile-strength?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/performance?location=${q}${pfQs}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/review-breakdown?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/review-ai?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/ranking?location=${q}`).then((r) => r.json()).catch(() => null),
    ]);
    setStrength(st && st.score !== undefined ? st : null);
    setPerf(pf && pf.ok ? pf : null);
    setStars(sc && sc.ok ? sc : null);
    setAi(ia2 && ia2.ok ? ia2 : null);
    setRank(rk && Array.isArray(rk.runs) && rk.runs[0] ? rk.runs[0] : null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, period, cStart, cEnd]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBrand(extra?: Partial<{ logo_url: string }>) {
    setSavingBrand(true);
    setBrandMsg("");
    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, phone, site, logo_url: extra?.logo_url ?? logoUrl }),
      });
      if (!res.ok) throw new Error("falha");
      setBrandMsg("Marca salva!");
      setTimeout(() => setBrandMsg(""), 2500);
    } catch {
      setBrandMsg("Não foi possível salvar.");
    } finally {
      setSavingBrand(false);
    }
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBrandMsg("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `branding/${user?.id ?? "x"}/logo-${Date.now()}.${ext}`;
      const { error } = await sb.storage.from("post-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const url = sb.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      setLogoUrl(url);
      await saveBrand({ logo_url: url });
    } catch {
      setBrandMsg("Não foi possível enviar o logo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const periodo =
    period === "30" ? "últimos 30 dias"
      : period === "60" ? "últimos 60 dias"
        : period === "90" ? "últimos 90 dias"
          : perf?.range ? `${MES[+perf.range.start.slice(5, 7) - 1]} a ${MES[+perf.range.end.slice(5, 7) - 1]} de ${perf.range.end.slice(0, 4)}`
            : "últimos 6 meses";
  const anyOn = Object.values(sec).some(Boolean);

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
      {/* ---------- Painel (não imprime) ---------- */}
      <div className="space-y-4 print:hidden">
        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Perfil do relatório</p>
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand">
            {locations.map((l) => <option key={l.location_name} value={l.location_name}>{l.title ?? l.location_name}</option>)}
          </select>
          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted">Período (Desempenho)</p>
          <div className="flex flex-wrap gap-1.5">
            {(["30", "60", "90", "180", "custom"] as const).map((k) => (
              <button key={k} onClick={() => setPeriod(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${period === k ? "bg-brand text-white" : "border border-border text-muted hover:bg-surface-2"}`}>
                {k === "30" ? "30 dias" : k === "60" ? "60 dias" : k === "90" ? "90 dias" : k === "180" ? "6 meses" : "Personalizado"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="mt-3 flex items-center gap-2">
              <input type="month" value={cStart} onChange={(e) => setCStart(e.target.value)} className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-brand" />
              <span className="text-muted">–</span>
              <input type="month" value={cEnd} onChange={(e) => setCEnd(e.target.value)} className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-brand" />
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Sua marca</p>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2 text-[10px] text-muted">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-contain" />
              ) : ("Logo")}
            </span>
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold transition hover:bg-surface-2 disabled:opacity-60">
                {uploading ? "Enviando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
              <p className="mt-1 text-[11px] text-muted">PNG/JPG, fundo transparente fica melhor.</p>
            </div>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted">Nome da agência</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sua agência" className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] font-semibold text-muted">Cor da marca</span>
            <span className="mt-1 flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-10 rounded-lg border border-border bg-white p-0.5" />
              <input value={color} onChange={(e) => setColor(e.target.value)} className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
            </span>
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] font-semibold text-muted">Telefone / WhatsApp</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] font-semibold text-muted">Site</span>
            <input value={site} onChange={(e) => setSite(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => saveBrand()} disabled={savingBrand} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {savingBrand ? "Salvando…" : "Salvar marca"}
            </button>
            {brandMsg && <span className="text-xs text-brand-2">{brandMsg}</span>}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Seções do relatório</p>
          <p className="mb-2 text-[11px] text-muted">Clique na seção para escolher item a item o que aparece.</p>
          {SECTIONS.map(({ key, label, subs }) => {
            const open = expanded === key;
            return (
              <div key={key} className="border-b border-border/60 py-2 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setExpanded(open ? null : key)} className="flex items-center gap-1.5 text-sm font-medium">
                    <svg viewBox="0 0 24 24" className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                    {label}
                  </button>
                  <input type="checkbox" checked={sec[key]} onChange={() => setSec((s) => ({ ...s, [key]: !s[key] }))} className="h-5 w-5 accent-brand-2" />
                </div>
                {open && (
                  <div className={`mt-2 space-y-1 pl-6 ${sec[key] ? "" : "pointer-events-none opacity-40"}`}>
                    {subs.map((x) => (
                      <label key={x.key} className="flex cursor-pointer items-center justify-between gap-3 text-xs">
                        <span className="text-muted">{x.label}</span>
                        <input type="checkbox" checked={sub[`${key}.${x.key}`] ?? true} onChange={() => setSub((s) => ({ ...s, [`${key}.${x.key}`]: !(s[`${key}.${x.key}`] ?? true) }))} className="h-4 w-4 accent-brand-2" />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="mt-4">
            <button onClick={() => window.print()} className="w-full rounded-lg bg-brand-2 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              Baixar PDF
            </button>
            <p className="mt-2 text-[11px] text-muted">Abre a impressão — escolha &ldquo;Salvar como PDF&rdquo;.</p>
          </div>
        </div>
      </div>

      {/* ---------- Prévia (imprime) ---------- */}
      <div id="relatorio-print" className="overflow-hidden rounded-3xl border border-border bg-white card-soft print:rounded-none print:border-0 print:shadow-none" style={{ ["--accent" as string]: color }}>
        {/* Cabeçalho com a marca */}
        <div className="flex items-center gap-4 p-6 text-white" style={{ background: color }}>
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-sm font-extrabold" style={{ color }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
            ) : (name || "AG").trim().slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold">{name || "Sua agência"}</p>
            <p className="truncate text-xs text-white/85">Relatório de desempenho · {activeTitle} · {periodo}</p>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {loading && <p className="text-sm text-muted">Carregando dados do Google…</p>}
          {!loading && !anyOn && <p className="text-sm text-muted">Selecione ao menos uma seção.</p>}

          {!loading && sec.forca && (
            <Sec color={color} title="Força do perfil">
              {strength?.score != null ? (
                <div className="flex items-center gap-4">
                  {sOn("forca", "anel") && <Ring score={strength.score} color={color} />}
                  {sOn("forca", "resumo") && <p className="text-sm text-muted"><strong className="text-foreground">{strength.bom}</strong> bons · <strong className="text-foreground">{strength.razoavel}</strong> a melhorar · <strong className="text-foreground">{strength.fraco}</strong> faltando</p>}
                </div>
              ) : <Empty>Rode a Análise Completa deste perfil para incluir a nota.</Empty>}
            </Sec>
          )}

          {!loading && sec.desemp && (
            <Sec color={color} title={`Desempenho · ${periodo}`}>
              {perf?.kpis ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-8">
                    {sOn("desemp", "views") && <Kpi3 v={fmtK(perf.kpis.impressions.current)} l="Visualizações" c={perf.kpis.impressions.changeYoY} />}
                    {sOn("desemp", "inter") && <Kpi3 v={perf.kpis.interactions.current.toLocaleString("pt-BR")} l="Interações" c={perf.kpis.interactions.changeYoY} />}
                    {sOn("desemp", "pesq") && <Kpi3 v={fmtK(perf.searches?.total ?? 0)} l="Pesquisas" c={perf.searches?.changeYoY} />}
                  </div>

                  {sOn("desemp", "acoes") && perf.engagement?.metrics && perf.engagement.metrics.some((m) => m.value > 0) && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-muted">Ações dos clientes</p>
                      <div className="grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
                        {perf.engagement.metrics.filter((m) => m.value > 0).map((m) => (
                          <div key={m.key} className="flex items-center justify-between border-b border-border/50 py-1">
                            <span className="text-muted">{m.label}</span>
                            <span className="font-semibold">{m.value.toLocaleString("pt-BR")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    {sOn("desemp", "origem") && perf.sources && perf.sources.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">De onde vêm</p>
                        {(() => {
                          const tot = perf.sources!.reduce((s, x) => s + x.value, 0) || 1;
                          return perf.sources!.map((s) => (
                            <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-muted">{s.label}</span>
                              <span className="shrink-0 font-semibold">{Math.round((s.value / tot) * 100)}%</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                    {sOn("desemp", "termos") && perf.keywords && perf.keywords.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">Termos de pesquisa mais fortes</p>
                        {perf.keywords.slice(0, 5).map((k, i) => (
                          <div key={k.keyword} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-muted">{i + 1}. {k.keyword}</span>
                            <span className="shrink-0 font-semibold">{k.approx ? "<" : ""}{k.value.toLocaleString("pt-BR")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : <Empty>Sem dados de desempenho no período.</Empty>}
            </Sec>
          )}

          {!loading && sec.aval && (
            <Sec color={color} title="Avaliações">
              {perf?.reviews || stars ? (
                <div>
                  {sOn("aval", "nota") && (
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-3xl font-extrabold">{(stars?.average ?? perf?.reviews?.average ?? 0).toFixed(1)}</span>
                      <span className="text-lg text-amber-500">★★★★★</span>
                      <span className="text-sm text-muted">{(stars?.total ?? perf?.reviews?.total ?? 0).toLocaleString("pt-BR")} avaliações</span>
                    </div>
                  )}
                  {sOn("aval", "dist") && stars && stars.sampled > 0 && (
                    <div className="mt-3 max-w-sm space-y-1">
                      {stars.counts.map((c) => {
                        const pct = Math.round((c.count / stars.sampled) * 100);
                        return (
                          <div key={c.stars} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-right text-muted">{c.stars}</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></span>
                            <span className="w-8 text-right text-muted">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : <Empty>Sem avaliações para este perfil.</Empty>}
            </Sec>
          )}

          {!loading && sec.ia && (
            <Sec color={color} title="Resumo com IA das avaliações">
              {ai && (ai.summary || ai.praises?.length || ai.complaints?.length) ? (
                <div className="space-y-2 text-sm">
                  {sOn("ia", "resumo") && ai.summary && <p className="text-muted">{ai.summary}</p>}
                  {sOn("ia", "elogios") && ai.praises?.length > 0 && <p><span className="font-semibold text-emerald-600">👍 Elogios: </span><span className="text-muted">{ai.praises.join(" · ")}</span></p>}
                  {sOn("ia", "atencao") && ai.complaints?.length > 0 && <p><span className="font-semibold text-red-500">👎 Atenção: </span><span className="text-muted">{ai.complaints.join(" · ")}</span></p>}
                </div>
              ) : <Empty>Sem comentários suficientes para o resumo da IA.</Empty>}
            </Sec>
          )}

          {!loading && sec.rank && (
            <Sec color={color} title="Ranking no Google Maps (geo-grid)">
              {rank ? (
                <div className="flex flex-wrap items-center gap-6">
                  {sOn("rank", "mapa") && <GeoGrid run={rank} />}
                  {sOn("rank", "metricas") && (
                    <div className="text-sm">
                      <p className="text-muted">Busca: <strong className="text-foreground">{rank.keyword}</strong> · grade {rank.grid_size}×{rank.grid_size}</p>
                      <p className="mt-1 text-muted">Posição média: <strong className="text-foreground">{rank.avg_rank ?? "—"}</strong></p>
                      <p className="text-muted">No top 3: <strong className="text-foreground">{rank.top3_pct ?? 0}%</strong> · no top 10: <strong className="text-foreground">{rank.top10_pct ?? 0}%</strong></p>
                    </div>
                  )}
                </div>
              ) : <Empty>Rode uma Análise de Ranking para este perfil para incluir o mapa.</Empty>}
            </Sec>
          )}
        </div>

        {/* Rodapé com a marca */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2 px-6 py-3 text-xs text-muted">
          <span>{[name, phone, site].filter(Boolean).join(" · ") || "Sua agência"}</span>
          <span>Gerado por GMN Profile</span>
        </div>
      </div>
    </div>
  );
}

function Sec({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 border-l-4 pl-2 text-sm font-bold text-foreground" style={{ borderColor: color }}>{title}</h3>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">{children}</p>;
}
function Kpi3({ v, l, c }: { v: string; l: string; c?: number | null }) {
  const up = c != null && c > 0, down = c != null && c < 0;
  return (
    <div>
      <p className="font-display text-2xl font-extrabold leading-none">{v}</p>
      {c != null && <span className={`text-[11px] font-semibold ${up ? "text-brand-2" : down ? "text-red-500" : "text-muted"}`}>{up ? "▲" : down ? "▼" : "■"} {Math.abs(c)}% ano a ano</span>}
      <p className="mt-0.5 text-[11px] text-muted">{l}</p>
    </div>
  );
}
function Ring({ score, color }: { score: number; color: string }) {
  const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score));
  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#eef1f4" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="absolute text-sm font-extrabold" style={{ color }}>{v}%</span>
    </div>
  );
}
function GeoGrid({ run }: { run: RankRun }) {
  const n = Math.max(1, run.grid_size || 3);
  const pts = Array.isArray(run.points) ? (run.points as unknown[]) : [];
  const rankAt = (i: number): number | null => {
    const p = pts[i] as { rank?: number; position?: number } | number | undefined;
    if (typeof p === "number") return p;
    if (p && typeof p === "object") return (p.rank ?? p.position ?? null) as number | null;
    return null;
  };
  const cor = (rk: number | null) => (rk == null ? "#e5e7eb" : rk <= 3 ? "#22C7B8" : rk <= 10 ? "#f59e0b" : "#f87171");
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, 20px)` }}>
      {Array.from({ length: n * n }).map((_, i) => {
        const rk = rankAt(i);
        return (
          <span key={i} className="grid h-5 w-5 place-items-center rounded text-[9px] font-bold text-white" style={{ background: cor(rk) }}>
            {rk != null && rk <= 20 ? rk : ""}
          </span>
        );
      })}
    </div>
  );
}
