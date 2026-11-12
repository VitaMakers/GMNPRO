"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";
import {
  AUTO_ITEM_IDS,
  CHECKLIST,
  classify,
  priorities,
  scoreFrom,
  type ChecklistItem,
  type ItemStatus,
} from "@/lib/checklist";
import type { MapPoint } from "@/components/LocationsMap";

const LocationsMap = dynamic(() => import("@/components/LocationsMap"), { ssr: false });

const STORAGE_KEY = "gmnpro.checklist";

type AutoResult = Record<string, { done: boolean; detail?: string; status?: ItemStatus }>;
type LocationOption = {
  location_name: string;
  title: string | null;
  lat?: number | null;
  lng?: number | null;
};
type AuditProfile = {
  title: string; category: string; secondaryCategories: string[]; address: string;
  phone: string; website: string; description: string; rating: number; reviewCount: number;
  photoUrl: string | null; lat: number | null; lng: number | null;
  mapsUri: string | null; searchUri: string | null; verified: boolean; open: boolean;
  foundingDate: string | null; hoursCount: number; photoCount: number; postCount: number;
};

const STATUS_COLOR: Record<ItemStatus, { bg: string; border: string; text: string; dot: string }> = {
  bom: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", dot: "#059669" },
  razoavel: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", dot: "#d97706" },
  fraco: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", dot: "#dc2626" },
};

export default function ChecklistTool({
  locations = [],
  connected = false,
}: {
  locations?: LocationOption[];
  connected?: boolean;
}) {
  const autoEnabled = connected && locations.length > 0;

  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [auto, setAuto] = useState<AutoResult | null>(null);
  const [profile, setProfile] = useState<AuditProfile | null>(null);
  const active = useActiveProfile();
  const selected = active ?? locations[0]?.location_name ?? "";
  const selectedTitle = locations.find((l) => l.location_name === selected)?.title ?? "perfil";
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Coordenadas de todos os perfis (vindas do /api/profiles, que faz o backfill).
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [mapMode, setMapMode] = useState<"pins" | "heat">("pins");
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  async function share() {
    setSharing(true);
    try {
      const res = await fetch("/api/report/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: selected }) });
      const d = await res.json();
      if (res.ok) {
        setShareUrl(d.url);
        try { await navigator.clipboard.writeText(d.url); } catch { /* ignore */ }
      } else setError(d.detail ?? d.error ?? "Não foi possível gerar o link.");
    } finally {
      setSharing(false);
    }
  }

  useEffect(() => {
    if (!autoEnabled) return;
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, { lat: number; lng: number }> = {};
        for (const p of (d.profiles ?? []) as { location_name: string; lat: number | null; lng: number | null }[]) {
          if (typeof p.lat === "number" && typeof p.lng === "number") map[p.location_name] = { lat: p.lat, lng: p.lng };
        }
        setCoords(map);
      })
      .catch(() => undefined);
  }, [autoEnabled]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setManual(JSON.parse(raw));
    } catch {
      /* ignora */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (locations[0]) initActiveProfile(locations[0].location_name);
  }, [locations]);

  // Ao trocar de perfil no topo, limpa a análise anterior.
  useEffect(() => {
    setAuto(null);
    setProfile(null);
    setAnalyzedAt(null);
    setError("");
    setShareUrl("");
  }, [selected]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manual));
    } catch {
      /* ignora */
    }
  }, [manual, loaded]);

  const isAuto = (id: string) => autoEnabled && AUTO_ITEM_IDS.has(id);

  // Estado combinado: itens automáticos vêm da análise; o resto é manual.
  const checked = useMemo(() => {
    const merged: Record<string, boolean> = {};
    for (const cat of CHECKLIST) {
      for (const item of cat.items) {
        merged[item.id] = isAuto(item.id) ? auto?.[item.id]?.done ?? false : !!manual[item.id];
      }
    }
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual, auto, autoEnabled]);

  const allItems = useMemo(() => CHECKLIST.flatMap((c) => c.items), []);
  const scored = useMemo(
    () => (autoEnabled ? allItems.filter((it) => AUTO_ITEM_IDS.has(it.id)) : allItems),
    [allItems, autoEnabled],
  );
  const manualItems = useMemo(
    () => (autoEnabled ? allItems.filter((it) => !AUTO_ITEM_IDS.has(it.id)) : []),
    [allItems, autoEnabled],
  );

  const score = useMemo(() => {
    if (!autoEnabled) return scoreFrom(checked);
    const total = scored.reduce((s, i) => s + i.weight, 0);
    const got = scored.filter((i) => checked[i.id]).reduce((s, i) => s + i.weight, 0);
    return total ? Math.round((got / total) * 100) : 0;
  }, [checked, autoEnabled, scored]);

  const top = useMemo(
    () => priorities(checked).filter((it) => scored.some((s) => s.id === it.id)).slice(0, 5),
    [checked, scored],
  );
  const totalItems = scored.length;
  const doneItems = scored.filter((i) => checked[i.id]).length;

  const toggle = (id: string) => setManual((c) => ({ ...c, [id]: !c[id] }));
  const reset = () => setManual({});

  async function analyze() {
    if (!selected) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`/api/google/audit-profile?location=${encodeURIComponent(selected)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao analisar.");
      setAuto(data.auto as AutoResult);
      if (data.profile) setProfile(data.profile as AuditProfile);
      setAnalyzedAt(new Date().toLocaleString("pt-BR"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível analisar o perfil.");
    } finally {
      setAnalyzing(false);
    }
  }

  const label = score >= 75 ? "Bom" : score >= 50 ? "Razoável" : "Fraco";
  const color = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const ring = score >= 75 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";

  // Pontuação detalhada: Bom (feito), Fraco (falta e importante), Razoável (falta leve).
  const detail = { bom: 0, fraco: 0, razoavel: 0 };
  const statusOf = (it: ChecklistItem) => classify(it, !!checked[it.id], isAuto(it.id) ? auto?.[it.id]?.status : undefined);
  for (const it of scored) detail[statusOf(it)]++;

  // Pontos do Mapa de Locais: locais com coordenadas em cache + o perfil analisado.
  const mapPoints: MapPoint[] = useMemo(() => {
    const pts: MapPoint[] = [];
    for (const l of locations) {
      const isSel = l.location_name === selected;
      // Perfil analisado agora traz coordenadas ao vivo.
      const c = coords[l.location_name];
      const lat = isSel && profile?.lat != null ? profile.lat : (c?.lat ?? l.lat);
      const lng = isSel && profile?.lng != null ? profile.lng : (c?.lng ?? l.lng);
      if (typeof lat === "number" && typeof lng === "number") {
        pts.push({ title: l.title ?? "Perfil", lat, lng, active: isSel, detail: isSel ? "Perfil selecionado" : undefined });
      }
    }
    return pts;
  }, [locations, selected, profile, coords]);

  return (
    <div className="space-y-6">
      {/* Análise automática */}
      {autoEnabled ? (
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <h2 className="font-semibold">Análise completa do perfil</h2>
          <p className="mt-1 text-sm text-muted">
            Escolha o perfil e o sistema lê o Google em tempo real e marca sozinho o que já está
            feito, calcula a nota e mostra o que falta. Sem extensão do Chrome — tudo dentro do GMN PRO.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5 text-sm font-medium text-brand-2 sm:max-w-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {selectedTitle}
            </span>
            <button
              onClick={analyze}
              disabled={analyzing}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {analyzing ? "Analisando…" : analyzedAt ? "Analisar de novo" : "Analisar meu perfil"}
            </button>
          </div>
          {analyzedAt && !error && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-brand-2">Perfil analisado em {analyzedAt}.</span>
              <button onClick={share} disabled={sharing} className="rounded-lg bg-foreground px-3 py-1.5 font-semibold text-white disabled:opacity-60">
                {sharing ? "Gerando…" : "Relatório PDF / Link para o cliente"}
              </button>
              {shareUrl && (
                <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="truncate text-brand-2 underline">
                  {shareUrl} (copiado)
                </a>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          {!analyzedAt && !error && (
            <p className="mt-3 text-xs text-muted">
              Os itens com o selo <AutoBadge /> são preenchidos automaticamente após a análise.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 text-sm text-muted">
          Conecte o Google e sincronize seus perfis (na aba <span className="font-medium text-foreground">Agendamentos</span>)
          para a análise automática. Enquanto isso, você pode preencher a análise manualmente abaixo.
        </div>
      )}

      {/* Layout principal (igual ao GBP): mapa + notas à esquerda, card do perfil à direita */}
      {autoEnabled ? (
        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-4">
            {/* Mapa com abas */}
            <div className="overflow-hidden rounded-3xl border border-border bg-white card-soft">
              <div className="grid grid-cols-2 gap-2 p-2">
                {(["pins", "heat"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMapMode(m)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      mapMode === m ? "bg-brand text-white" : "border border-border bg-white text-foreground hover:bg-surface-2"
                    }`}
                  >
                    {m === "pins" ? "Mapa de Locais" : "Mapa de Calor"}
                  </button>
                ))}
              </div>
              <div className="px-2 pb-2">
                {mapPoints.length > 0 ? (
                  <LocationsMap points={mapPoints} mode={mapMode} height={340} />
                ) : (
                  <div className="grid h-[340px] place-items-center rounded-2xl border border-dashed border-border bg-surface-2 px-4 text-center text-sm text-muted">
                    Carregando a localização dos seus perfis…
                  </div>
                )}
              </div>
            </div>

            {/* Pontuação geral (velocímetro) + Pontuação detalhada */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col items-center rounded-3xl border border-border bg-white p-6 card-soft">
                <p className="font-display text-lg font-bold">Pontuação Geral</p>
                <p className="text-xs text-muted">Desempenho do negócio</p>
                <Gauge value={analyzedAt ? score : 0} />
                <p className={`-mt-2 text-4xl font-bold ${analyzedAt ? color : "text-muted"}`}>{analyzedAt ? score : "—"}</p>
                <span
                  className="mt-2 rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-wide"
                  style={analyzedAt ? { borderColor: `${ring}66`, background: `${ring}14`, color: ring } : { borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  {analyzedAt ? label : "Analise o perfil"}
                </span>
                <p className="mt-2 text-xs text-muted">{doneItems} de {totalItems} itens concluídos</p>
              </div>

              <div className="rounded-3xl border border-border bg-white p-6 card-soft">
                <p className="mb-4 text-center font-display text-lg font-bold">Pontuação Detalhada</p>
                <ul className="space-y-3">
                  {[
                    { n: detail.fraco, label: "Fraco", sub: "Métricas que precisam de atenção", c: STATUS_COLOR.fraco.dot },
                    { n: detail.razoavel, label: "Razoável", sub: "Métricas com potencial de melhoria", c: STATUS_COLOR.razoavel.dot },
                    { n: detail.bom, label: "Bom", sub: "Métricas em excelente estado", c: STATUS_COLOR.bom.dot },
                  ].map((r) => (
                    <li key={r.label} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold text-white shadow" style={{ background: analyzedAt ? r.c : "#cbd5e1" }}>{analyzedAt ? r.n : "–"}</span>
                      <span>
                        <span className="block text-sm font-semibold">{r.label}</span>
                        <span className="block text-xs text-muted">{r.sub}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Card do perfil (coluna da direita) */}
          {profile ? (
            <ProfileCard profile={profile} fallbackTitle={selectedTitle} />
          ) : (
            <div className="grid min-h-[400px] place-items-center rounded-3xl border border-dashed border-border bg-white p-6 text-center card-soft">
              <div>
                <GoogleG className="mx-auto h-10 w-10" />
                <p className="mt-3 font-semibold">{selectedTitle}</p>
                <p className="mt-1 text-sm text-muted">Clique em <strong>Analisar meu perfil</strong> para ver o card completo do Google.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Modo manual (sem Google conectado) */
        <div className="sticky top-16 z-20 flex items-center gap-4 rounded-3xl border border-border bg-white card-soft/95 p-4 backdrop-blur">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${ring} ${score * 3.6}deg, var(--surface-2) 0deg)` }}>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white">
              <span className={`text-xl font-bold ${color}`}>{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Sua nota de otimização</p>
            <p className="text-xs text-muted">{doneItems} de {totalItems} itens concluídos</p>
          </div>
          <button onClick={reset} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:bg-surface-2">Limpar</button>
        </div>
      )}

      {autoEnabled && manualItems.length > 0 && analyzedAt && (
        <p className="rounded-2xl border border-border bg-white p-3 text-xs text-muted card-soft">
          A nota considera só o que dá para verificar no Google. Há{" "}
          <span className="font-medium text-foreground">{manualItems.length} itens de hábito</span>{" "}
          (ex.: pedir avaliações, mensagens) que só você confirma — marque-os na lista abaixo.
        </p>
      )}

      {/* Prioridades */}
      {top.length > 0 && (
        <div className="rounded-3xl border border-border bg-white card-soft p-5">
          <h2 className="mb-3 font-semibold">O que falta para concluir</h2>
          <ol className="space-y-2">
            {top.map((item, i) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <span className="font-semibold text-red-500">{i + 1}.</span>
                <span>
                  <span className="font-medium">{item.label}</span>
                  <span className="block text-xs text-muted">{item.tip}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {top.length === 0 && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm font-medium text-emerald-700">
          Parabéns! Seu perfil está 100% otimizado segundo esta análise. Mantenha a
          constância de postagens e avaliações.
        </div>
      )}

      {/* Categorias */}
      {CHECKLIST.map((cat) => {
        const catDone = cat.items.filter((i) => checked[i.id]).length;
        return (
          <div key={cat.id} className="rounded-3xl border border-border bg-white card-soft p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{cat.title}</h3>
              <span className="text-xs text-muted">
                {catDone}/{cat.items.length}
              </span>
            </div>
            <ul className="space-y-2">
              {cat.items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  checked={!!checked[item.id]}
                  status={statusOf(item)}
                  auto={isAuto(item.id)}
                  detail={auto?.[item.id]?.detail}
                  analyzed={!!analyzedAt}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AutoBadge() {
  return (
    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-2 align-middle">
      ⚡ auto
    </span>
  );
}

/** Velocímetro semicircular (vermelho → amarelo → verde) com ponteiro. */
function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = -90 + (v / 100) * 180; // -90 (esq) a +90 (dir)
  const arc = (from: number, to: number, color: string) => {
    const r = 70, cx = 100, cy = 100;
    const a0 = (Math.PI * (180 + from * 1.8)) / 180;
    const a1 = (Math.PI * (180 + to * 1.8)) / 180;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`} stroke={color} strokeWidth="22" fill="none" strokeLinecap="butt" />;
  };
  return (
    <svg viewBox="0 0 200 115" className="mt-3 w-full max-w-[260px]">
      {arc(0, 50, "#dc2626")}
      {arc(50, 75, "#f59e0b")}
      {arc(75, 100, "#059669")}
      <g transform={`rotate(${angle} 100 100)`}>
        <path d="M 100 100 L 96 100 L 100 38 L 104 100 Z" fill="#1f2937" />
      </g>
      <circle cx="100" cy="100" r="8" fill="#1f2937" />
      <circle cx="100" cy="100" r="3.5" fill="#fff" />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center" aria-label={`${rating} estrelas`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" fill={i < full ? "#fbbc05" : i === full && half ? "url(#half)" : "#dadce0"}>
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#fbbc05" />
              <stop offset="50%" stopColor="#dadce0" />
            </linearGradient>
          </defs>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

function ProfileCard({ profile, fallbackTitle }: { profile: AuditProfile; fallbackTitle: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white card-soft">
      {/* Capa + avatar */}
      <div className="relative h-28 w-full bg-gradient-to-r from-brand/15 to-brand-2/15">
        {profile.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute -bottom-6 left-5 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-white bg-surface-2 shadow">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <GoogleG className="h-7 w-7" />
          )}
        </span>
      </div>

      <div className="p-5 pt-8">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-lg font-bold leading-tight tracking-tight">
            {profile.title || fallbackTitle}
          </p>
        </div>

        {/* Nota + avaliações */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          {profile.rating > 0 && (
            <>
              <span className="font-semibold text-foreground">{profile.rating.toFixed(1)}</span>
              <Stars rating={profile.rating} />
              {profile.reviewCount > 0 && (
                <span className="text-muted">({profile.reviewCount} avaliações)</span>
              )}
            </>
          )}
        </div>

        {/* Categoria */}
        {profile.category && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted">
            <IconTag /> {profile.category}
          </p>
        )}
        {profile.secondaryCategories.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {profile.secondaryCategories.slice(0, 4).map((c) => (
              <span key={c} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{c}</span>
            ))}
          </div>
        )}

        {/* Selos */}
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              <IconCheck /> Verificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
              <IconAlert /> Não verificado
            </span>
          )}
          {!profile.open && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
              Fechado permanentemente
            </span>
          )}
        </div>

        {/* Botões (no topo, como no GBP) */}
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.searchUri && (
            <a href={profile.searchUri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-surface-2">
              <GoogleG className="h-4 w-4" /> Ver na Pesquisa
            </a>
          )}
          {profile.mapsUri && (
            <a href={profile.mapsUri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-surface-2">
              <span className="text-brand-2"><IconPin /></span> Ver no Maps
            </a>
          )}
        </div>

        {/* Dados com ícones */}
        <div className="mt-3 space-y-1.5 text-sm">
          {profile.address && <InfoRow icon={<IconPin />} text={profile.address} />}
          {profile.phone && <InfoRow icon={<IconPhone />} text={profile.phone} />}
          {profile.website && (
            <InfoRow
              icon={<IconGlobe />}
              text={
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="truncate text-brand-2 hover:underline">
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              }
            />
          )}
          {profile.hoursCount > 0 && <InfoRow icon={<IconClock />} text={`${profile.hoursCount} período(s) de horário cadastrados`} />}
          {profile.foundingDate && <InfoRow icon={<IconFlag />} text={`Aberto desde ${profile.foundingDate}`} />}
        </div>

        {/* Mini-stats */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="Fotos" value={profile.photoCount} />
          <MiniStat label="Postagens" value={profile.postCount} />
        </div>

        {/* Descrição */}
        {profile.description && (
          <div className="mt-3 rounded-xl border border-border/60 bg-surface-2 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Descrição</p>
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-line text-xs text-foreground/80">{profile.description}</p>
          </div>
        )}
      </div>
    </div>
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

function Row({
  item,
  checked,
  status,
  auto,
  detail,
  analyzed,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  status: ItemStatus;
  auto: boolean;
  detail?: string;
  analyzed: boolean;
  onToggle: () => void;
}) {
  // Itens automáticos: só leitura (preenchidos pela análise), com cor por status.
  if (auto) {
    const pending = !analyzed;
    const c = STATUS_COLOR[status];
    return (
      <li>
        <div
          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left ${
            pending ? "border-border bg-surface-2" : `${c.border} ${c.bg}`
          }`}
        >
          <span
            className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold text-white"
            style={pending ? { borderColor: "var(--border)", color: "var(--muted)" } : { background: c.dot, borderColor: c.dot }}
          >
            {checked ? "✓" : pending ? "" : "!"}
          </span>
          <span className="min-w-0">
            <span className="block text-sm">
              {item.label}
              <AutoBadge />
            </span>
            {!pending && (
              <span className={`mt-0.5 block text-xs font-medium ${c.text}`}>
                {status === "bom" ? "Bom" : status === "razoavel" ? "Razoável" : "Fraco"}
                {detail ? ` · ${detail}` : ""}
              </span>
            )}
            {!checked && !pending && (
              <span className="mt-0.5 block text-xs text-muted">{item.tip}</span>
            )}
            {pending && (
              <span className="mt-0.5 block text-xs text-muted">Será verificado na análise.</span>
            )}
          </span>
        </div>
      </li>
    );
  }

  // Itens manuais: clicáveis; cor por status (verde feito / amarelo-vermelho pendente).
  const c = STATUS_COLOR[status];
  return (
    <li>
      <button
        onClick={onToggle}
        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${c.border} ${c.bg} hover:brightness-[0.98]`}
      >
        <span
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold text-white"
          style={{ background: c.dot, borderColor: c.dot }}
        >
          {checked ? "✓" : "!"}
        </span>
        <span>
          <span className="block text-sm font-medium">{item.label}</span>
          <span className={`mt-0.5 block text-xs font-medium ${c.text}`}>
            {status === "bom" ? "Bom" : status === "razoavel" ? "Razoável" : "Fraco"}
          </span>
          {!checked && <span className="mt-0.5 block text-xs text-muted">{item.tip}</span>}
        </span>
      </button>
    </li>
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

const ico = "h-4 w-4";
function IconPin() { return <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function IconPhone() { return <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" /></svg>; }
function IconGlobe() { return <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>; }
function IconClock() { return <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function IconTag() { return <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7-7A2 2 0 013 12.2V5a2 2 0 012-2h7.2a2 2 0 011.4.6l7 7a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></svg>; }
function IconFlag() { return <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21V4a1 1 0 011-1h13l-2 4 2 4H6" /></svg>; }
function IconCheck() { return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>; }
function IconAlert() { return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>; }
