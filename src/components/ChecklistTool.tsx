"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";
import {
  AUTO_ITEM_IDS,
  CHECKLIST,
  priorities,
  scoreFrom,
  type ChecklistItem,
} from "@/lib/checklist";

const STORAGE_KEY = "gmnpro.checklist";

type AutoResult = Record<string, { done: boolean; detail?: string }>;
type LocationOption = { location_name: string; title: string | null };
type AuditProfile = {
  title: string; category: string; address: string; phone: string;
  website: string; description: string; rating: number; reviewCount: number;
  photoUrl: string | null;
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

  // Com perfil conectado, a NOTA considera só os itens que dá para verificar
  // automático (não penaliza por hábitos que o Google não expõe).
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

  const color = score >= 75 ? "text-brand-2" : score >= 50 ? "text-accent" : "text-red-400";
  const ring = score >= 75 ? "#34a853" : score >= 50 ? "#fbbc05" : "#f87171";

  // Pontuação detalhada: Bom (feito), Fraco (falta e importante), Razoável (falta leve).
  const detail = { bom: 0, fraco: 0, razoavel: 0 };
  for (const it of scored) {
    if (checked[it.id]) detail.bom++;
    else if (it.weight >= 5) detail.fraco++;
    else detail.razoavel++;
  }

  return (
    <div className="space-y-6">
      {/* Análise automática */}
      {autoEnabled ? (
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <h2 className="font-semibold">Análise automática do perfil</h2>
          <p className="mt-1 text-sm text-muted">
            Escolha o perfil e o sistema lê o Google e marca sozinho o que já está feito,
            calcula a nota e mostra o que falta.
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
            <p className="mt-3 text-xs text-brand-2">Perfil analisado em {analyzedAt}.</p>
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
          para a análise automática. Enquanto isso, você pode preencher o checklist manualmente abaixo.
        </div>
      )}

      {/* Nota */}
      <div className="sticky top-16 z-20 flex items-center gap-4 rounded-3xl border border-border bg-white card-soft/95 p-4 backdrop-blur">
        <div
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${ring} ${score * 3.6}deg, var(--surface-2) 0deg)` }}
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-surface">
            <span className={`text-xl font-bold ${color}`}>{score}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Sua nota de otimização</p>
          <p className="text-xs text-muted">
            {doneItems} de {totalItems} itens concluídos
          </p>
        </div>
        {!autoEnabled && (
          <button
            onClick={reset}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:bg-surface-2"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Pontuação detalhada + card do perfil (após a análise) */}
      {profile && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-border bg-white p-6 card-soft">
            <p className="mb-4 text-sm font-semibold">Pontuação detalhada</p>
            <ul className="space-y-3">
              {[
                { n: detail.fraco, label: "Fraco", sub: "Precisam de atenção", c: "#ef4444" },
                { n: detail.razoavel, label: "Razoável", sub: "Dá para melhorar", c: "#d97706" },
                { n: detail.bom, label: "Bom", sub: "Em ótimo estado", c: "#059669" },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: r.c }}>{r.n}</span>
                  <span>
                    <span className="block text-sm font-semibold" style={{ color: r.c }}>{r.label}</span>
                    <span className="block text-xs text-muted">{r.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
            {manualItems.length > 0 && (
              <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted">
                A nota considera só o que dá para verificar no Google. Há{" "}
                <span className="font-medium text-foreground">{manualItems.length} itens de hábito</span>{" "}
                (ex.: pedir avaliações, mensagens) que só você confirma — marque-os na lista abaixo.
              </p>
            )}
          </div>

          {/* Card do perfil */}
          <div className="overflow-hidden rounded-3xl border border-border bg-white card-soft">
            {profile.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt="" className="h-32 w-full object-cover" />
            )}
            <div className="p-5">
              <p className="font-display text-lg font-bold tracking-tight">{profile.title || selectedTitle}</p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                {profile.rating > 0 && (
                  <span className="font-semibold text-accent">{profile.rating.toFixed(1)} ★</span>
                )}
                {profile.reviewCount > 0 && <span className="text-muted">({profile.reviewCount})</span>}
                {profile.category && <span className="text-muted">· {profile.category}</span>}
              </div>
              {profile.address && <p className="mt-2 text-sm text-muted">{profile.address}</p>}
              {profile.phone && <p className="text-sm text-muted">{profile.phone}</p>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-sm text-brand-2 hover:underline">
                  {profile.website}
                </a>
              )}
              {profile.description && (
                <p className="mt-3 line-clamp-4 text-xs text-muted">{profile.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prioridades */}
      {top.length > 0 && (
        <div className="rounded-3xl border border-border bg-white card-soft p-5">
          <h2 className="mb-3 font-semibold">O que falta para concluir</h2>
          <ol className="space-y-2">
            {top.map((item, i) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <span className="font-semibold text-brand">{i + 1}.</span>
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
        <div className="rounded-2xl border border-brand-2/40 bg-brand-2/10 p-5 text-sm font-medium text-brand-2">
          Parabéns! Seu perfil está 100% otimizado segundo este checklist. Mantenha a
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

function Row({
  item,
  checked,
  auto,
  detail,
  analyzed,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  auto: boolean;
  detail?: string;
  analyzed: boolean;
  onToggle: () => void;
}) {
  // Itens automáticos: só leitura (preenchidos pela análise).
  if (auto) {
    const pending = !analyzed;
    return (
      <li>
        <div
          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left ${
            checked
              ? "border-brand-2/40 bg-brand-2/10"
              : pending
                ? "border-border bg-surface-2"
                : "border-red-400/30 bg-red-400/5"
          }`}
        >
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
              checked
                ? "border-brand-2 bg-brand-2 text-white"
                : pending
                  ? "border-border"
                  : "border-red-400/50 text-red-400"
            }`}
          >
            {checked ? "✓" : pending ? "" : "✕"}
          </span>
          <span className="min-w-0">
            <span className="block text-sm">
              {item.label}
              <AutoBadge />
            </span>
            {checked && detail ? (
              <span className="mt-0.5 block text-xs text-brand-2">{detail}</span>
            ) : !checked ? (
              <span className="mt-0.5 block text-xs text-muted">
                {pending ? "Será verificado na análise." : item.tip}
              </span>
            ) : null}
          </span>
        </div>
      </li>
    );
  }

  // Itens manuais: clicáveis.
  return (
    <li>
      <button
        onClick={onToggle}
        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
          checked ? "border-brand-2/40 bg-brand-2/10" : "border-border bg-surface-2 hover:border-brand/40"
        }`}
      >
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
            checked ? "border-brand-2 bg-brand-2 text-white" : "border-border"
          }`}
        >
          {checked ? "✓" : ""}
        </span>
        <span>
          <span className={`block text-sm ${checked ? "text-foreground" : "font-medium"}`}>
            {item.label}
          </span>
          {!checked && <span className="mt-0.5 block text-xs text-muted">{item.tip}</span>}
        </span>
      </button>
    </li>
  );
}
