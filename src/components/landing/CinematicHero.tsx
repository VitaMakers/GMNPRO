"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Abertura cinematográfica no estilo "keynote": a tela começa escura e revela
 * uma frase de impacto por vez — fecha no título principal com os CTAs.
 * Inspiração visual: reveal estilo Apple (fundo escuro, brilho, texto central).
 * Respeita prefers-reduced-motion e tem botão "pular".
 */

type Beat =
  | { kind: "line"; pre?: string; strong: string; sub?: string }
  | { kind: "orb"; pre: string; strong: string }
  | { kind: "gauge"; target: number; label: string };

const BEATS: Beat[] = [
  { kind: "line", strong: "Isto é PRO." },
  { kind: "orb", pre: "Com", strong: "Inteligência Artificial." },
  { kind: "gauge", target: 91, label: "Saúde do seu perfil" },
  { kind: "line", strong: "Veja a mágica acontecer." },
];

function Orb() {
  return (
    <span className="relative inline-grid h-[1.1em] w-[1.1em] translate-y-[0.12em] place-items-center">
      <span className="absolute inset-0 animate-pulse rounded-[30%] bg-emerald-400/30 blur-md" />
      <svg viewBox="0 0 24 24" className="relative h-full w-full text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3.2" />
        <g opacity="0.9">
          <ellipse cx="12" cy="12" rx="9" ry="3.6" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
        </g>
      </svg>
    </span>
  );
}

function GaugeBeat({ target }: { target: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const pct = Math.min(100, (n / 100) * 100);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-[72px] w-[min(78vw,420px)] overflow-hidden rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500/70 via-emerald-400/60 to-emerald-300/70 transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-4xl font-bold tabular-nums text-white drop-shadow sm:text-5xl">{n}</span>
        </div>
      </div>
      <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/50">Saúde do seu perfil</p>
    </div>
  );
}

export default function CinematicHero() {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = () => {
    timers.current.forEach(clearTimeout);
    setDone(true);
  };

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }
    // Cada beat dura ~1.8s; o gauge um pouco mais.
    let acc = 0;
    BEATS.forEach((b, idx) => {
      const hold = b.kind === "gauge" ? 2400 : 1850;
      const t = setTimeout(() => setI(idx), acc);
      timers.current.push(t);
      acc += hold;
    });
    const end = setTimeout(() => setDone(true), acc);
    timers.current.push(end);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#070b09] text-white">
      {/* brilho de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
      </div>

      {!done ? (
        <div className="relative mx-auto flex min-h-[78vh] max-w-5xl items-center justify-center px-4 text-center">
          {BEATS.map((b, idx) => {
            if (idx !== i) return null;
            return (
              <div key={idx} className="animate-[cineIn_700ms_ease-out]">
                {b.kind === "gauge" ? (
                  <GaugeBeat target={b.target} />
                ) : b.kind === "orb" ? (
                  <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                    <span className="text-white/70">{b.pre} </span>
                    <Orb />{" "}
                    <span className="bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-100 bg-clip-text text-transparent">
                      {b.strong}
                    </span>
                  </h2>
                ) : (
                  <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                    {b.pre && <span className="text-white/70">{b.pre} </span>}
                    <span className="text-white">{b.strong}</span>
                  </h2>
                )}
              </div>
            );
          })}

          <button
            onClick={finish}
            className="absolute bottom-6 right-6 rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Pular ▸
          </button>
        </div>
      ) : (
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28 animate-[cineIn_700ms_ease-out]">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/70">
            <Orb /> Gestão inteligente do Google Meu Negócio
          </p>
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Seu Google Meu Negócio,
            <br />
            <span className="bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-100 bg-clip-text text-transparent">
              no automático.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60 sm:text-xl">
            A IA agenda posts, responde avaliações, analisa seu perfil e mostra em quais bairros você
            aparece primeiro. Você cuida do negócio — o GMN PRO cuida do Google.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/entrar?signup=1"
              className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#070b09] transition hover:bg-emerald-50"
            >
              Começar teste grátis
            </Link>
            <Link
              href="/recursos"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              Ver o que faz <span>→</span>
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/40">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      )}
    </section>
  );
}
