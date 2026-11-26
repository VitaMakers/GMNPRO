"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rankingMetrics, RANKING_GLOSSARY, competitorTable } from "@/lib/rankingMetrics";

type Loc = { location_name: string; title: string | null };
type Branding = { name?: string; logo_url?: string; color?: string; phone?: string; site?: string } | null;

interface ChkItem { id: string; category: string; label: string; status: "bom" | "razoavel" | "fraco"; tip: string; detail?: string }
interface Profile { title?: string; category?: string; address?: string; phone?: string; website?: string; rating?: number; reviewCount?: number; photoCount?: number; postCount?: number; hoursCount?: number; foundingDate?: string | null; photoUrl?: string | null; verified?: boolean }
interface Strength { score: number | null; fraco: number; razoavel: number; bom: number; title?: string; items?: ChkItem[]; profile?: Profile | null }
interface Kpi { current: number; change?: number | null; changeYoY?: number | null }
interface EngMetric { key: string; label: string; value: number; series?: number[] }
interface ReviewLatest { author: string; stars: number; comment: string; createTime: string }
interface Perf {
  range?: { start: string; end: string };
  periodDays?: number;
  kpis?: { impressions: Kpi; interactions: Kpi; website: Kpi; calls: Kpi; directions: Kpi; conversations: Kpi };
  engagement?: { monthLabels: string[]; all: EngMetric; metrics: EngMetric[] };
  sources?: { label: string; value: number }[];
  keywords?: { keyword: string; value: number; approx: boolean }[];
  series?: { date: string; value: number }[];
  searches?: { total: number; changeYoY: number | null };
  reviews?: { average: number; total: number; latest?: ReviewLatest[] } | null;
}
interface Stars { average: number; total: number; sampled: number; counts: { stars: number; count: number }[] }
interface AI { summary: string; praises: string[]; complaints: string[] }
interface RankRun { keyword: string; grid_size: number; avg_rank: number | null; top3_pct: number | null; top10_pct: number | null; points?: { rank: number | null; top?: { title: string; rank: number; rating?: number | null; reviews?: number | null; me?: boolean; placeId?: string | null }[] }[] }
interface MediaItem { thumbnailUrl: string | null; createTime: string | null; isVideo: boolean; views: number }
interface MediaData { total: number; photoCount: number; videoCount: number; totalViews: number; items: MediaItem[] }
interface PostItem { summary: string; createTime: string | null; topicType: string | null; searchUrl: string | null; thumbnailUrl: string | null; ctaType: string | null }

const MES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const fmtK = (n: number) =>
  n >= 1_000_000 ? (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi" : n >= 1000 ? (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : n.toLocaleString("pt-BR");

type SecKey = "resumoExec" | "capa" | "forca" | "evolucao" | "desemp" | "grafico" | "midia" | "posts" | "servicos" | "aval" | "reviewsRec" | "ia" | "checklist" | "rank" | "concorrentes" | "obs" | "plano";
const SECTIONS: { key: SecKey; label: string; editable?: string; subs: { key: string; label: string }[] }[] = [
  { key: "resumoExec", label: "📝 Resumo executivo (você escreve)", editable: "Escreva uma abertura: o panorama do mês para o cliente…", subs: [] },
  { key: "capa", label: "🏢 Ficha da empresa", subs: [] },
  { key: "forca", label: "💪 Força do perfil", subs: [
    { key: "anel", label: "Nota (anel %)" },
    { key: "resumo", label: "Resumo (bons / a melhorar / faltando)" },
  ] },
  { key: "evolucao", label: "📉 Evolução da nota (histórico)", subs: [] },
  { key: "desemp", label: "📊 Desempenho", subs: [
    { key: "views", label: "Visualizações" },
    { key: "inter", label: "Interações" },
    { key: "pesq", label: "Pesquisas" },
    { key: "acoes", label: "Ações dos clientes" },
    { key: "origem", label: "De onde vêm" },
    { key: "termos", label: "Termos de pesquisa" },
  ] },
  { key: "grafico", label: "📈 Evolução mensal (gráfico)", subs: [
    { key: "views", label: "Visualizações" },
    { key: "inter", label: "Interações" },
  ] },
  { key: "aval", label: "⭐ Avaliações", subs: [
    { key: "nota", label: "Nota + total" },
    { key: "dist", label: "Distribuição por estrela" },
  ] },
  { key: "midia", label: "🖼️ Fotos e vídeos do perfil", subs: [] },
  { key: "posts", label: "📣 Postagens (Google Posts)", subs: [] },
  { key: "servicos", label: "🛠️ Serviços do perfil", subs: [] },
  { key: "reviewsRec", label: "💬 Avaliações recentes", subs: [] },
  { key: "ia", label: "🤖 Resumo com IA", subs: [
    { key: "resumo", label: "Parágrafo-resumo" },
    { key: "elogios", label: "Elogios" },
    { key: "atencao", label: "Pontos de atenção" },
  ] },
  { key: "checklist", label: "✅ Análise Completa (checklist)", subs: [
    { key: "completo", label: "Checklist completo" },
    { key: "melhorar", label: "O que melhorar" },
  ] },
  { key: "rank", label: "🗺️ Ranking no Maps", subs: [
    { key: "mapa", label: "Mapa (grade)" },
    { key: "metricas", label: "Métricas ARP / ATRP / SoLV" },
    { key: "glossario", label: "Glossário das métricas" },
  ] },
  { key: "concorrentes", label: "🏁 Comparação de concorrentes", subs: [] },
  { key: "obs", label: "🔎 Observações da agência (você escreve)", editable: "O que você observou neste período, análise, insights…", subs: [] },
  { key: "plano", label: "🚀 Próximos passos (você escreve)", editable: "Um por linha: o que será feito no próximo mês…", subs: [] },
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
  const [sec, setSec] = useState<Record<SecKey, boolean>>(() => Object.fromEntries(SECTIONS.map((s) => [s.key, true])) as Record<SecKey, boolean>);
  const [sub, setSub] = useState<Record<string, boolean>>({ ...ALL_SUBS });
  const [expanded, setExpanded] = useState<SecKey | null>(null);
  const [txt, setTxt] = useState<Record<string, string>>({});
  const sOn = (s: SecKey, k: string) => sec[s] && (sub[`${s}.${k}`] ?? true);

  // Dados
  const [strength, setStrength] = useState<Strength | null>(null);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [stars, setStars] = useState<Stars | null>(null);
  const [ai, setAi] = useState<AI | null>(null);
  const [rank, setRank] = useState<RankRun | null>(null);
  const [hist, setHist] = useState<{ score: number; analyzed_at: string }[]>([]);
  const [media, setMedia] = useState<MediaData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Compartilhar / enviar
  const [shareCode, setShareCode] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailFreq, setEmailFreq] = useState<"once" | "biweekly" | "monthly">("once");
  const [emailNote, setEmailNote] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

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
    const [st, pf, sc, ia2, rk, hs, md, ps, sv] = await Promise.all([
      fetch(`/api/google/profile-strength?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/performance?location=${q}${pfQs}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/review-breakdown?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/review-ai?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/ranking?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/score-history?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/list-media?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/list-posts?location=${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/google/list-services?location=${q}`).then((r) => r.json()).catch(() => null),
    ]);
    setStrength(st && st.score !== undefined ? st : null);
    setPerf(pf && pf.ok ? pf : null);
    setStars(sc && sc.ok ? sc : null);
    setAi(ia2 && ia2.ok ? ia2 : null);
    setRank(rk && Array.isArray(rk.runs) && rk.runs[0] ? rk.runs[0] : null);
    setHist(hs && Array.isArray(hs.history) ? hs.history : []);
    setMedia(md && md.ok ? md : null);
    setPosts(ps && ps.ok && Array.isArray(ps.items) ? ps.items : []);
    setServices(sv && sv.ok && Array.isArray(sv.items) ? sv.items : []);
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

  async function doShare() {
    if (!loc) return;
    setShareBusy(true);
    setShareMsg("");
    setShareUrl("");
    try {
      const res = await fetch("/api/report/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: loc, accessCode: shareCode.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShareMsg(data.detail || (data.error === "sem_analise" ? "Rode a Análise Completa deste perfil primeiro." : "Não foi possível gerar o link."));
        return;
      }
      setShareUrl(data.url);
    } catch {
      setShareMsg("Falha ao gerar o link.");
    } finally {
      setShareBusy(false);
    }
  }

  async function doEmail() {
    if (!loc) return;
    setEmailBusy(true);
    setEmailMsg("");
    try {
      const res = await fetch("/api/report/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: loc, to: emailTo, note: emailNote.trim() || undefined, frequency: emailFreq }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailMsg(
          data.error === "not_configured" ? "Envio de e-mail não configurado (RESEND_API_KEY)."
            : data.error === "sem_analise" ? "Rode a Análise Completa deste perfil primeiro."
              : data.error === "dados_invalidos" ? "Confira os e-mails informados."
                : data.detail || "Não foi possível enviar.",
        );
        return;
      }
      const freqTxt = data.frequency === "biweekly" ? " · agendado quinzenal" : data.frequency === "monthly" ? " · agendado mensal" : "";
      setEmailMsg(`Enviado para ${data.sent} destinatário(s)${freqTxt}.`);
    } catch {
      setEmailMsg("Falha ao enviar.");
    } finally {
      setEmailBusy(false);
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
          {SECTIONS.map(({ key, label, subs, editable }) => {
            const open = expanded === key;
            const hasSubs = subs.length > 0;
            return (
              <div key={key} className="border-b border-border/60 py-2 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => hasSubs && setExpanded(open ? null : key)} className={`flex items-center gap-1.5 text-sm font-medium ${hasSubs ? "" : "cursor-default"}`}>
                    {hasSubs ? (
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                    ) : <span className="inline-block w-4" />}
                    {label}
                  </button>
                  <input type="checkbox" checked={sec[key]} onChange={() => setSec((s) => ({ ...s, [key]: !s[key] }))} className="h-5 w-5 accent-brand-2" />
                </div>
                {hasSubs && open && (
                  <div className={`mt-2 space-y-1 pl-6 ${sec[key] ? "" : "pointer-events-none opacity-40"}`}>
                    {subs.map((x) => (
                      <label key={x.key} className="flex cursor-pointer items-center justify-between gap-3 text-xs">
                        <span className="text-muted">{x.label}</span>
                        <input type="checkbox" checked={sub[`${key}.${x.key}`] ?? true} onChange={() => setSub((s) => ({ ...s, [`${key}.${x.key}`]: !(s[`${key}.${x.key}`] ?? true) }))} className="h-4 w-4 accent-brand-2" />
                      </label>
                    ))}
                  </div>
                )}
                {editable && sec[key] && (
                  <textarea value={txt[key] ?? ""} onChange={(e) => setTxt((t) => ({ ...t, [key]: e.target.value }))} placeholder={editable} rows={3} className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
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

        {/* Compartilhar e enviar */}
        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Compartilhar e enviar</p>
          <p className="mb-3 text-[11px] text-muted">Gere um link para o cliente ou envie o relatório por e-mail.</p>

          {/* Link do cliente */}
          <label className="text-xs font-medium text-muted">Código de acesso (opcional)</label>
          <input
            value={shareCode}
            onChange={(e) => setShareCode(e.target.value)}
            placeholder="ex.: 4821 — deixe vazio para link aberto"
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button onClick={doShare} disabled={shareBusy || !loc} className="mt-2 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {shareBusy ? "Gerando…" : "Gerar link do cliente"}
          </button>
          {shareUrl && (
            <div className="mt-2 rounded-lg border border-border bg-surface-2 p-2">
              <p className="break-all text-[11px] text-foreground">{shareUrl}</p>
              <div className="mt-1 flex items-center gap-3">
                <button onClick={() => { navigator.clipboard?.writeText(shareUrl); setShareMsg("Link copiado!"); }} className="text-[11px] font-medium text-brand hover:underline">Copiar link</button>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-brand hover:underline">Abrir</a>
                {shareCode.trim() && <span className="text-[11px] text-muted">código: <strong className="text-foreground">{shareCode.trim()}</strong></span>}
              </div>
            </div>
          )}
          {shareMsg && <p className="mt-1 text-[11px] text-brand-2">{shareMsg}</p>}

          {/* E-mail */}
          <div className="mt-4 border-t border-border/60 pt-3">
            <label className="text-xs font-medium text-muted">Enviar por e-mail (vários separados por vírgula)</label>
            <input
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="cliente@empresa.com, financeiro@empresa.com"
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <textarea
              value={emailNote}
              onChange={(e) => setEmailNote(e.target.value)}
              placeholder="Mensagem (opcional) que vai no corpo do e-mail…"
              rows={2}
              className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted">Frequência:</span>
              {([["once", "Só agora"], ["biweekly", "Quinzenal"], ["monthly", "Mensal"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEmailFreq(v)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${emailFreq === v ? "border-brand bg-brand text-white" : "border-border hover:bg-surface-2"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button onClick={doEmail} disabled={emailBusy || !loc} className="mt-2 w-full rounded-lg bg-brand-2 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {emailBusy ? "Enviando…" : emailFreq === "once" ? "Enviar agora" : "Enviar e agendar"}
            </button>
            {emailMsg && <p className="mt-1 text-[11px] text-brand-2">{emailMsg}</p>}
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

          {!loading && sec.resumoExec && txt.resumoExec?.trim() && (
            <Sec color={color} title="Resumo executivo">
              <p className="whitespace-pre-wrap text-sm text-muted">{txt.resumoExec}</p>
            </Sec>
          )}

          {!loading && sec.capa && (
            <Sec color={color} title="A empresa">
              {strength?.profile ? (
                <div className="flex items-start gap-4">
                  {strength.profile.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={strength.profile.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="text-sm leading-relaxed">
                    <p className="font-semibold text-foreground">{strength.profile.title}{strength.profile.verified ? " ✔" : ""}</p>
                    {strength.profile.category && <p className="text-muted">{strength.profile.category}</p>}
                    {strength.profile.address && <p className="text-muted">📍 {strength.profile.address}</p>}
                    {(strength.profile.phone || strength.profile.website) && (
                      <p className="text-muted">{[strength.profile.phone && `📞 ${strength.profile.phone}`, strength.profile.website && `🌐 ${strength.profile.website.replace(/^https?:\/\//, "")}`].filter(Boolean).join("  ·  ")}</p>
                    )}
                    <p className="text-muted">⭐ {(strength.profile.rating ?? 0).toFixed(1)} ({(strength.profile.reviewCount ?? 0).toLocaleString("pt-BR")}) · 📸 {strength.profile.photoCount ?? 0} fotos · 📝 {strength.profile.postCount ?? 0} posts</p>
                  </div>
                </div>
              ) : <Empty>Rode a Análise Completa para incluir a ficha da empresa.</Empty>}
            </Sec>
          )}

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

          {!loading && sec.evolucao && (
            <Sec color={color} title="Evolução da nota">
              {hist.length >= 2 ? (() => {
                const fmtD = (d: string) => {
                  const dt = new Date(d);
                  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
                };
                const first = hist[0].score;
                const last = hist[hist.length - 1].score;
                const delta = last - first;
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                      <span className="text-3xl font-bold" style={{ color }}>{last}%</span>
                      <span className="text-sm text-muted">
                        {delta === 0 ? "estável" : delta > 0 ? `▲ +${delta} pts` : `▼ ${delta} pts`} desde {fmtD(hist[0].analyzed_at)}
                      </span>
                    </div>
                    <Chart labels={hist.map((h) => fmtD(h.analyzed_at))} values={hist.map((h) => h.score)} color={color} />
                  </div>
                );
              })() : <Empty>Rode a Análise Completa pelo menos 2 vezes para mostrar a evolução da nota ao longo do tempo.</Empty>}
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

          {!loading && sec.grafico && (
            <Sec color={color} title="Evolução mensal">
              {perf?.series && perf.series.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {sOn("grafico", "views") && (() => { const m = monthlyFromDaily(perf.series!); return (
                    <div><p className="mb-1 text-xs font-semibold text-muted">Visualizações</p><Chart labels={m.labels} values={m.values} color={color} /></div>
                  ); })()}
                  {sOn("grafico", "inter") && perf.engagement && (
                    <div><p className="mb-1 text-xs font-semibold text-muted">Interações</p><Chart labels={perf.engagement.monthLabels} values={perf.engagement.all.series ?? []} color={color} /></div>
                  )}
                </div>
              ) : <Empty>Sem série para o gráfico neste período.</Empty>}
            </Sec>
          )}

          {!loading && sec.midia && (
            <Sec color={color} title="Fotos e vídeos do perfil">
              {media && media.total > 0 ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-6 text-sm">
                    <span className="text-muted"><strong className="text-foreground">{media.photoCount}</strong> fotos</span>
                    <span className="text-muted"><strong className="text-foreground">{media.videoCount}</strong> vídeos</span>
                    <span className="text-muted"><strong className="text-foreground">{fmtK(media.totalViews)}</strong> visualizações</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {media.items.filter((m) => m.thumbnailUrl).slice(0, 12).map((m, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={m.thumbnailUrl!} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              ) : <Empty>Nenhuma foto ou vídeo encontrado no perfil (ou acesso de mídia indisponível).</Empty>}
            </Sec>
          )}

          {!loading && sec.posts && (
            <Sec color={color} title="Postagens (Google Posts)">
              {posts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted"><strong className="text-foreground">{posts.length}</strong> postagens publicadas</p>
                  {posts.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                      {p.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm text-foreground">{p.summary || <span className="text-muted">(sem texto)</span>}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {p.topicType && p.topicType !== "STANDARD" ? `${p.topicType} · ` : ""}
                          {p.createTime ? new Date(p.createTime).toLocaleDateString("pt-BR") : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty>Nenhuma postagem (Google Post) encontrada neste perfil.</Empty>}
            </Sec>
          )}

          {!loading && sec.servicos && (
            <Sec color={color} title="Serviços do perfil">
              {services.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s, i) => (
                    <span key={i} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">{s}</span>
                  ))}
                </div>
              ) : <Empty>Nenhum serviço cadastrado no perfil (ou o segmento não expõe serviços).</Empty>}
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

          {!loading && sec.reviewsRec && (
            <Sec color={color} title="Avaliações recentes">
              {perf?.reviews?.latest && perf.reviews.latest.length > 0 ? (
                <div className="space-y-2">
                  {perf.reviews.latest.slice(0, 4).map((r, i) => (
                    <div key={i} className="rounded-xl border border-border/60 bg-surface-2 p-3">
                      <p className="text-xs font-semibold">{r.author} <span className="text-amber-500">{"★".repeat(Math.max(0, Math.min(5, r.stars)))}</span></p>
                      {r.comment && <p className="mt-0.5 line-clamp-3 text-xs text-muted">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : <Empty>Sem avaliações recentes com texto.</Empty>}
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

          {!loading && sec.checklist && (
            <Sec color={color} title="Análise Completa do perfil">
              {strength?.items && strength.items.length > 0 ? (
                <div className="space-y-3">
                  {sOn("checklist", "completo") && (
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      {strength.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-2 text-xs">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.status === "bom" ? "#22C7B8" : it.status === "razoavel" ? "#f59e0b" : "#f87171" }} />
                          <span className="flex-1 truncate text-muted">{it.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sOn("checklist", "melhorar") && (() => {
                    const m = strength.items!.filter((it) => it.status !== "bom");
                    return m.length > 0 ? (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">O que melhorar primeiro</p>
                        <ol className="space-y-1">
                          {m.slice(0, 6).map((it, i) => (<li key={it.id} className="text-xs text-muted"><strong className="text-foreground">{i + 1}. {it.label}:</strong> {it.tip}</li>))}
                        </ol>
                      </div>
                    ) : <p className="text-xs text-muted">Perfil completo! 🎉</p>;
                  })()}
                </div>
              ) : <Empty>Rode a Análise Completa para incluir o checklist.</Empty>}
            </Sec>
          )}

          {!loading && sec.rank && (
            <Sec color={color} title="Ranking no Google Maps (geo-grid)">
              {rank ? (
                <div className="flex flex-wrap items-center gap-6">
                  {sOn("rank", "mapa") && <GeoGrid run={rank} />}
                  {sOn("rank", "metricas") && (() => {
                    const m = rankingMetrics(rank.points);
                    return (
                      <div className="text-sm">
                        <p className="text-muted">Busca: <strong className="text-foreground">{rank.keyword}</strong> · grade {rank.grid_size}×{rank.grid_size}</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                          <div><p className="text-lg font-bold leading-none" style={{ color }}>{m.arp != null ? m.arp.toLocaleString("pt-BR") : "—"}</p><p className="text-[11px] text-muted">ARP · pos. média</p></div>
                          <div><p className="text-lg font-bold leading-none" style={{ color }}>{m.atrp != null ? m.atrp.toLocaleString("pt-BR") : "—"}</p><p className="text-[11px] text-muted">ATRP · pos. total</p></div>
                          <div><p className="text-lg font-bold leading-none" style={{ color }}>{m.solv}%</p><p className="text-[11px] text-muted">SoLV · top 3</p></div>
                          <div><p className="text-lg font-bold leading-none" style={{ color }}>{rank.top10_pct ?? 0}%</p><p className="text-[11px] text-muted">Top 10</p></div>
                        </div>
                        {sub["rank.glossario"] !== false && (
                          <dl className="mt-3 space-y-1 border-t border-border pt-2 text-[10px] text-muted">
                            {RANKING_GLOSSARY.map((g) => (
                              <div key={g.sigla}><dt className="inline font-semibold text-foreground">{g.sigla} — {g.nome}: </dt><dd className="inline">{g.desc}</dd></div>
                            ))}
                          </dl>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : <Empty>Rode uma Análise de Ranking para este perfil para incluir o mapa.</Empty>}
            </Sec>
          )}

          {!loading && sec.concorrentes && (
            <Sec color={color} title="Comparação de concorrentes">
              {(() => {
                const rows = rank ? competitorTable(rank.points) : [];
                if (!rank || rows.length === 0) return <Empty>Rode uma Análise de Ranking para comparar você com os concorrentes da região.</Empty>;
                const me = rows.find((r) => r.isMe);
                const rivals = rows.filter((r) => r !== me).slice(0, 6);
                const ordered = [me, ...rivals].filter(Boolean) as typeof rows;
                return (
                  <div>
                    <p className="mb-2 text-xs text-muted">Busca: <strong className="text-foreground">{rank.keyword}</strong> · SoLV = % de pontos no top 3 · ARP = posição média</p>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-muted">
                          <th className="pb-1 font-medium">Negócio</th>
                          <th className="pb-1 text-center font-medium">SoLV</th>
                          <th className="pb-1 text-center font-medium">ARP</th>
                          <th className="pb-1 text-center font-medium">Cobertura</th>
                          <th className="pb-1 text-center font-medium">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordered.map((r) => (
                          <tr key={r.key} className="border-t border-border/50">
                            <td className="py-1.5 pr-2" style={r === me ? { color, fontWeight: 600 } : undefined}>
                              <span className="block max-w-[200px] truncate" title={r.title}>{r.title}{r === me ? " (cliente)" : ""}</span>
                            </td>
                            <td className="py-1.5 text-center" style={r === me ? { color, fontWeight: 600 } : undefined}>{r.solv}%</td>
                            <td className="py-1.5 text-center">{r.arp != null ? r.arp.toLocaleString("pt-BR") : "—"}</td>
                            <td className="py-1.5 text-center">{r.coverage}%</td>
                            <td className="py-1.5 text-center text-muted">{r.rating != null ? `${r.rating}★` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Sec>
          )}

          {!loading && sec.obs && txt.obs?.trim() && (
            <Sec color={color} title="Observações da agência">
              <p className="whitespace-pre-wrap text-sm text-muted">{txt.obs}</p>
            </Sec>
          )}

          {!loading && sec.plano && txt.plano?.trim() && (
            <Sec color={color} title="Próximos passos">
              <ul className="space-y-1">
                {txt.plano.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted"><span style={{ color }}>✓</span>{l}</li>
                ))}
              </ul>
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

function monthlyFromDaily(series: { date: string; value: number }[]) {
  const acc = new Map<string, number>();
  for (const d of series) { const m = d.date.slice(0, 7); acc.set(m, (acc.get(m) ?? 0) + d.value); }
  const keys = [...acc.keys()].sort();
  return { labels: keys.map((k) => MES[+k.slice(5, 7) - 1]), values: keys.map((k) => acc.get(k) ?? 0) };
}
function Chart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const W = 300, H = 110, P = 8;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (W - 2 * P) / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${P + i * step},${H - P - (v / max) * (H - 2 * P)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 110 }}>
        <polyline points={`${P},${H - P} ${pts} ${W - P},${H - P}`} fill={`${color}22`} stroke="none" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" />
      </svg>
      <div className="flex justify-between text-[9px] text-muted">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
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
