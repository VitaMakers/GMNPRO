"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Status = "bom" | "razoavel" | "fraco";

interface Item {
  id: string;
  category: string;
  label: string;
  tip: string;
  status: Status;
  detail?: string;
}

interface Strength {
  score: number | null;
  fraco: number;
  razoavel: number;
  bom: number;
  items: Item[];
  title?: string;
  address?: string;
  photoUrl?: string | null;
  verified?: boolean;
  analyzed_at?: string | null;
}

// Mesma régua de cor da Auditoria: ≥75 bom (turquesa), ≥50 razoável (âmbar), <50 fraco.
function ringColor(score: number) {
  return score >= 75 ? "#22C7B8" : score >= 50 ? "#f59e0b" : "#f87171";
}
function faixa(score: number) {
  return score >= 75 ? "Bom" : score >= 50 ? "Razoável" : "Fraco";
}

export default function ProfileStrengthCard({ location, title: activeTitle = "" }: { location: string; title?: string }) {
  const [data, setData] = useState<Strength | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false); // "Como melhorar" fechado por padrão (abre no clique)
  const [error, setError] = useState("");

  const loadSnapshot = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/google/profile-strength?location=${encodeURIComponent(location)}`);
      const d = await res.json();
      setData(res.ok ? d : { score: null, fraco: 0, razoavel: 0, bom: 0, items: [] });
    } catch {
      setData({ score: null, fraco: 0, razoavel: 0, bom: 0, items: [] });
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Roda a Análise Completa (mesma do /auditoria) e atualiza o anel na hora.
  const analisar = useCallback(async () => {
    if (!location) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`/api/google/audit-profile?location=${encodeURIComponent(location)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "falha");
      const s = d.snapshot;
      setData({
        score: s.score,
        fraco: s.fraco,
        razoavel: s.razoavel,
        bom: s.bom,
        items: Array.isArray(s.items) ? s.items : [],
        title: s.title,
        address: s.profile?.address ?? "",
        photoUrl: s.profile?.photoUrl ?? null,
        verified: !!s.profile?.verified,
        analyzed_at: s.analyzed_at,
      });
    } catch (e) {
      setError(`Não foi possível analisar agora${e instanceof Error ? `: ${e.message}` : ""}.`);
    } finally {
      setAnalyzing(false);
    }
  }, [location]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-white p-6 card-soft">
        <div className="h-28 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  const score = data?.score ?? null;
  const name = (data?.title || activeTitle || "").trim();

  // Ainda não há análise salva: convida a rodar.
  if (score === null) {
    return (
      <div className="rounded-3xl border border-border bg-white card-soft">
        <ProfileHead name={name} address={data?.address} photoUrl={data?.photoUrl} verified={data?.verified} />
        <div className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <EmptyRing />
            <div>
              <p className="font-display text-base font-bold">Força do perfil</p>
              <p className="text-sm text-muted">
                Descubra a pontuação do seu perfil — e o que falta para chegar aos 100%.
              </p>
            </div>
          </div>
          <button
            onClick={analisar}
            disabled={analyzing}
            className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {analyzing ? "Analisando…" : "Analisar agora"}
          </button>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  const color = ringColor(score);
  const label = faixa(score);
  const melhorar = (data?.items ?? [])
    .filter((it) => it.status !== "bom")
    .sort((a, b) => (a.status === "fraco" ? -1 : 1) - (b.status === "fraco" ? -1 : 1));

  return (
    <div className="rounded-3xl border border-border bg-white card-soft">
      {/* Cabeçalho: logo + nome + endereço (como o app do Google) */}
      <ProfileHead name={name} address={data?.address} photoUrl={data?.photoUrl} verified={data?.verified} />

      <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center">
        <Ring score={score} color={color} />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <p className="font-display text-lg font-bold">Força do perfil</p>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: `${color}1a`, color }}
            >
              {label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {melhorar.length === 0
              ? "Perfil completo! Continue mantendo fotos, postagens e avaliações em dia. 💚"
              : "Saiba como melhorar sua pontuação — veja o que falta abaixo."}
          </p>

          {/* Mini-resumo bom / razoável / fraco */}
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs sm:justify-start">
            <Resumo n={data?.bom ?? 0} cor="#22C7B8" texto="bons" />
            <Resumo n={data?.razoavel ?? 0} cor="#f59e0b" texto="a melhorar" />
            <Resumo n={data?.fraco ?? 0} cor="#f87171" texto="faltando" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {melhorar.length > 0 && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-2"
              >
                {open ? "Ocultar" : "Como melhorar"}
                <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
            <Link
              href="/auditoria"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-brand-2 transition hover:bg-surface-2"
            >
              Ver análise completa →
            </Link>
            <button
              onClick={analisar}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
            >
              {analyzing ? "Atualizando…" : "↻ Atualizar"}
            </button>
          </div>
          {data?.analyzed_at && (
            <p className="mt-2 text-[11px] text-muted">
              Última análise: {new Date(data.analyzed_at).toLocaleDateString("pt-BR")}
            </p>
          )}
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      </div>

      {/* Lista do que melhorar */}
      {open && melhorar.length > 0 && (
        <div className="border-t border-border/60 p-5">
          <ul className="space-y-2">
            {melhorar.map((it) => (
              <li key={it.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-2 p-3">
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: it.status === "fraco" ? "#f87171" : "#f59e0b" }}
                >
                  {it.status === "fraco" ? "✕" : "!"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{it.label}</p>
                  {it.detail && <p className="text-xs text-muted">{it.detail}</p>}
                  <p className="mt-0.5 text-xs text-brand-2">{it.tip}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileHead({ name, address, photoUrl, verified }: { name: string; address?: string; photoUrl?: string | null; verified?: boolean }) {
  if (!name && !address && !photoUrl) return null;
  return (
    <div className="flex items-center gap-3 border-b border-border/60 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-sm font-bold text-brand-2">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          (name || "?").slice(0, 2).toUpperCase()
        )}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-base font-bold leading-tight">{name || "Seu perfil"}</p>
          {verified && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand-2" fill="currentColor" aria-label="Verificado">
              <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3.3 15l.9-2.9L3.3 9.2l2.4-1.8.9-2.9 3-.2L12 2z" />
              <path d="M10.3 14.6l-2-2 1.1-1.1 1 1 3-3 1.1 1.1-4.1 4z" fill="#fff" />
            </svg>
          )}
        </div>
        {address && <p className="truncate text-xs text-muted">{address}</p>}
      </div>
    </div>
  );
}

function Resumo({ n, cor, texto }: { n: number; cor: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
      <strong className="text-foreground">{n}</strong> {texto}
    </span>
  );
}

function Ring({ score, color }: { score: number; color: string }) {
  const r = 52;
  const sw = 12;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, score));
  const dash = (v / 100) * c;
  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2, #eef1f4)" strokeWidth={sw} />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-extrabold leading-none" style={{ color }}>
          {v}%
        </span>
      </div>
    </div>
  );
}

function EmptyRing() {
  const r = 52;
  const sw = 12;
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="h-24 w-24">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2, #eef1f4)" strokeWidth={sw} strokeDasharray="6 8" />
      </svg>
      <span className="absolute text-2xl">📊</span>
    </div>
  );
}
