"use client";

import { useEffect, useRef, useState } from "react";

const CLIENTS = [
  { name: "Buffet Vita Sorocaba", meta: "Restaurante · Sorocaba" },
  { name: "Padaria Pão Nosso", meta: "Padaria · Votorantim" },
  { name: "Clínica Sorriso", meta: "Odontologia · Sorocaba" },
  { name: "Auto Center Vale", meta: "Automotivo · Itu" },
];

const BARS = [34, 52, 44, 66, 58, 78, 88];

function useCount(target: number, run: boolean, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) {
      setV(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

// Estados que o card percorre, como no site de referência:
// 0 = conectando perfis (toggles acendem um a um)
// 1 = tudo conectado
// 2 = painel de desempenho do Google
export default function MockProfiles() {
  const [phase, setPhase] = useState(0);
  const [connected, setConnected] = useState(0); // quantos toggles acesos
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    if (phase === 0) {
      setConnected(0);
      CLIENTS.forEach((_, i) => {
        timers.current.push(setTimeout(() => setConnected(i + 1), 500 + i * 650));
      });
      timers.current.push(setTimeout(() => setPhase(1), 500 + CLIENTS.length * 650 + 900));
    } else if (phase === 1) {
      timers.current.push(setTimeout(() => setPhase(2), 2200));
    } else {
      timers.current.push(setTimeout(() => setPhase(0), 3600));
    }
    return clear;
  }, [phase]);

  const views = useCount(12840, phase === 2);
  const actions = useCount(1960, phase === 2);

  return (
    <div className="relative">
      {/* textura verde em movimento atrás do card */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70">
        <div className="mesh h-full w-full rounded-[2rem]" />
      </div>

      <div className="relative h-[352px] overflow-hidden rounded-3xl border border-border bg-white p-5 card-soft">
        {/* ---- Fases 0 e 1: lista de clientes conectando ---- */}
        <div
          className={`absolute inset-0 p-5 transition-all duration-500 ${
            phase === 2 ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">Conecte seus clientes</p>
              <p className="text-sm text-muted">Todos os perfis do Google numa conta só.</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                phase === 1
                  ? "bg-brand/10 text-brand-2"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {connected}/{CLIENTS.length}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {CLIENTS.map((c, i) => {
              const on = i < connected;
              return (
                <div
                  key={c.name}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-500 ${
                    on ? "border-brand/30 bg-brand/5" : "border-border bg-surface-2"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition ${
                        on ? "bg-brand/15 text-brand-2" : "bg-white text-muted"
                      }`}
                    >
                      {c.name[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted">{c.meta}</p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`hidden text-xs font-medium sm:inline ${
                        on ? "text-brand-2" : "text-muted"
                      }`}
                    >
                      {on ? "Conectado" : "···"}
                    </span>
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                        on ? "bg-brand" : "bg-border"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                          on ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Fase 2: painel de desempenho do Google ---- */}
        <div
          className={`absolute inset-0 p-5 transition-all duration-500 ${
            phase === 2 ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">Desempenho no Google</p>
              <p className="text-sm text-muted">Resumo dos últimos 30 dias</p>
            </div>
            <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted">
              Google
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <p className="text-2xl font-bold">{views.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted">
                Visualizações <span className="font-semibold text-brand-2">+24%</span>
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <p className="text-2xl font-bold">{actions.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted">
                Contatos e rotas <span className="font-semibold text-brand-2">+18%</span>
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">Visualizações por dia</p>
              <p className="text-xs font-semibold text-brand-2">▲ crescendo</p>
            </div>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t bg-brand/70 transition-all duration-500"
                  style={{
                    height: phase === 2 ? `${h}%` : "6%",
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
