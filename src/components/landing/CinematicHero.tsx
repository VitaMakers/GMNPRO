"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Abertura cinematográfica da home — estilo "keynote".
 * Cena de vidro líquido em 3D: um painel central (o "comando" do GMN PRO)
 * inclinado em perspectiva, com medidor subindo até 91, blocos de app em vidro
 * e cards satélite (avaliação respondida pela IA, mapa com pinos, post agendado)
 * que entram flutuando. Uma luz varre a superfície. Paleta: nosso verde.
 * Respeita prefers-reduced-motion.
 */

function useCountUp(target: number, run: boolean, dur = 1500) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, dur]);
  return n;
}

function Orb({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-grid place-items-center ${className}`}>
      <span className="absolute inset-0 animate-pulse rounded-[30%] bg-emerald-400/40 blur-md" />
      <svg viewBox="0 0 24 24" className="relative h-full w-full text-emerald-200" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="3" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
      </svg>
    </span>
  );
}

/* Anel de pontuação (gauge) */
function ScoreRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 80 80" className="h-[92px] w-[92px] -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke="url(#g)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#a7f3d0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="font-display text-2xl font-bold tabular-nums text-white">{value}</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-white/45">pontos</span>
      </div>
    </div>
  );
}

function Stars() {
  return (
    <span className="text-emerald-300">
      {"★★★★★".split("").map((s, i) => (
        <span key={i}>{s}</span>
      ))}
    </span>
  );
}

/* Card satélite de vidro */
function Glass({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] backdrop-blur-md ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default function CinematicHero() {
  const [mounted, setMounted] = useState(false);
  const [reduce, setReduce] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const score = useCountUp(91, mounted);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    setMounted(true);
  }, []);

  // leve parallax com o mouse
  useEffect(() => {
    if (reduce) return;
    const el = stageRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth,
        h = window.innerHeight;
      const rx = (e.clientY / h - 0.5) * -6;
      const ry = (e.clientX / w - 0.5) * 8;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce]);

  return (
    <section className="relative overflow-hidden bg-[#060a08] text-white">
      {/* brilhos de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12%] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[130px]" />
        <div className="absolute bottom-[-25%] left-[20%] h-[420px] w-[620px] rounded-full bg-emerald-400/12 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="absolute inset-0 [background:radial-gradient(70%_60%_at_50%_30%,transparent,rgba(0,0,0,0.65))]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pb-24 sm:pt-20">
        {/* badge */}
        <div className="mb-8 flex justify-center">
          <span className={`inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/75 ${mounted ? "animate-[cineIn_700ms_ease-out]" : "opacity-0"}`}>
            <Orb className="h-4 w-4" /> Gestão inteligente do Google Meu Negócio
          </span>
        </div>

        {/* título */}
        <h1 className={`text-center font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl ${mounted ? "animate-[cineIn_800ms_ease-out]" : "opacity-0"}`}>
          Seu Google no{" "}
          <span className="relative whitespace-nowrap">
            <span className="bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-100 bg-clip-text text-transparent">
              piloto automático
            </span>
          </span>
          .
        </h1>
        <p className={`mx-auto mt-5 max-w-2xl text-center text-lg text-white/60 sm:text-xl ${mounted ? "animate-[cineIn_900ms_ease-out]" : "opacity-0"}`}>
          A IA agenda posts, responde avaliações e mostra em quais bairros você aparece primeiro.
          Você cuida do negócio — o GMN PRO cuida do Google.
        </p>
        <div className={`mt-8 flex flex-wrap items-center justify-center gap-4 ${mounted ? "animate-[cineIn_1000ms_ease-out]" : "opacity-0"}`}>
          <Link href="/entrar?signup=1" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#060a08] transition hover:bg-emerald-50">
            Começar teste grátis
          </Link>
          <Link href="/recursos" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white">
            Ver o que faz <span>→</span>
          </Link>
        </div>

        {/* PALCO 3D */}
        <div className="mt-14 [perspective:1500px]">
          <div
            ref={stageRef}
            className={`relative mx-auto h-[360px] max-w-4xl [transform-style:preserve-3d] sm:h-[440px] ${!reduce ? "animate-[cineFloat_7s_ease-in-out_infinite]" : ""}`}
            style={{ transform: "rotateX(var(--rx,10deg)) rotateY(var(--ry,-6deg))", transition: "transform 300ms ease-out" }}
          >
            {/* Painel central de vidro */}
            <div className={`absolute left-1/2 top-1/2 w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 ${mounted && !reduce ? "animate-[panelIn_1100ms_cubic-bezier(.2,.7,.2,1)]" : ""}`}>
              <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-gradient-to-b from-white/[0.1] to-white/[0.03] p-5 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
                {/* luz varrendo */}
                {!reduce && (
                  <div className="pointer-events-none absolute inset-0 -skew-x-12 animate-[sweep_5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                )}
                {/* cabeçalho perfil */}
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">GV</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">Grupo Vita · Perfil do Google</p>
                    <p className="text-xs text-white/50">
                      <Stars /> <span className="ml-1">4,9 · 289 avaliações</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">● No ar</span>
                </div>

                {/* corpo */}
                <div className="mt-4 grid grid-cols-[auto_1fr] gap-4">
                  <div className="grid place-items-center rounded-2xl bg-white/[0.04] px-4">
                    <ScoreRing value={score} />
                  </div>
                  <div className="space-y-2">
                    {[
                      { k: "Visualizações", v: 92 },
                      { k: "Contatos e rotas", v: 74 },
                      { k: "Fotos e posts", v: 88 },
                    ].map((row, idx) => (
                      <div key={row.k}>
                        <div className="mb-1 flex justify-between text-[11px] text-white/55">
                          <span>{row.k}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                            style={{
                              width: mounted ? `${row.v}%` : "0%",
                              transition: `width 1100ms cubic-bezier(.2,.7,.2,1) ${idx * 120}ms`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* blocos de app em vidro */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { t: "Posts", d: "M4 5h16M4 12h16M4 19h10" },
                    { t: "Avaliações", d: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 21" },
                    { t: "Mapa", d: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0Z" },
                    { t: "IA", d: "M12 3v18M3 12h18" },
                  ].map((a) => (
                    <div key={a.t} className="grid place-items-center gap-1 rounded-xl border border-white/8 bg-white/[0.05] py-2.5">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={a.d} />
                      </svg>
                      <span className="text-[10px] font-medium text-white/60">{a.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card satélite: avaliação respondida pela IA */}
            <Glass
              className={`absolute left-[-2%] top-[2%] w-[220px] ${mounted && !reduce ? "animate-[floatA_8s_ease-in-out_infinite]" : ""}`}
              style={{ transform: "translateZ(90px)" }}
            >
              <div className="flex items-center gap-2 text-xs">
                <Stars />
                <span className="text-white/50">agora</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-white/70">“Atendimento impecável, voltarei!”</p>
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
                <Orb className="h-3.5 w-3.5" /> IA respondeu em segundos
              </div>
            </Glass>

            {/* Card satélite: mapa com pinos */}
            <Glass
              className={`absolute right-[-1%] top-[10%] w-[180px] ${mounted && !reduce ? "animate-[floatB_9s_ease-in-out_infinite]" : ""}`}
              style={{ transform: "translateZ(120px)" }}
            >
              <p className="mb-2 text-[11px] font-medium text-white/60">Onde você aparece 1º</p>
              <div className="relative h-20 overflow-hidden rounded-lg bg-[#0c1511]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(#2dd4bf22_1px,transparent_1px),linear-gradient(90deg,#2dd4bf22_1px,transparent_1px)] [background-size:16px_16px]" />
                {[
                  { x: "20%", y: "30%", c: "bg-emerald-400" },
                  { x: "55%", y: "20%", c: "bg-emerald-300" },
                  { x: "70%", y: "60%", c: "bg-yellow-400" },
                  { x: "35%", y: "70%", c: "bg-emerald-400" },
                  { x: "85%", y: "40%", c: "bg-red-400" },
                ].map((p, i) => (
                  <span
                    key={i}
                    className={`absolute h-2.5 w-2.5 rounded-full ${p.c} ${!reduce ? "animate-pulse" : ""}`}
                    style={{ left: p.x, top: p.y, boxShadow: "0 0 10px currentColor" }}
                  />
                ))}
              </div>
            </Glass>

            {/* Card satélite: post agendado */}
            <Glass
              className={`absolute bottom-[0%] left-[8%] w-[200px] ${mounted && !reduce ? "animate-[floatB_8.5s_ease-in-out_infinite]" : ""}`}
              style={{ transform: "translateZ(70px)" }}
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-white">Post agendado</p>
                  <p className="text-[10px] text-white/50">Amanhã · 09:00 · automático</p>
                </div>
              </div>
            </Glass>
          </div>
        </div>

        {/* selos */}
        <p className="mt-10 text-center text-xs text-white/40">
          Conectado à API oficial do Google · Sem cartão de crédito · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}
