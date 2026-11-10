"use client";

import { useEffect, useRef, useState } from "react";

function useCount(target: number, run: boolean, ms = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
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

const BARS = [38, 58, 50, 72, 64, 82, 90];

export default function MockPerformance() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  // Dispara a animação quando o card entra na tela (e repete a cada ciclo).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setRun(true);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reinicia a contagem periodicamente para o efeito "subindo" continuar.
  useEffect(() => {
    if (!run) return;
    const loop = setInterval(() => {
      setRun(false);
      setTimeout(() => setRun(true), 60);
    }, 5200);
    return () => clearInterval(loop);
  }, [run]);

  const views = useCount(4820, run);
  const actions = useCount(612, run);
  const pct = useCount(90, run);

  return (
    <div ref={ref} className="rounded-3xl border border-border bg-white p-6 card-soft">
      <p className="text-sm font-semibold">Desempenho · últimos 30 dias</p>

      <div className="mt-5 flex items-center gap-6">
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full transition-[background] duration-100"
          style={{ background: `conic-gradient(var(--brand) ${pct * 3.6}deg, var(--surface-2) 0deg)` }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
            <span className="text-xl font-bold">{pct}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-2xl font-bold">{views.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted">
              Visualizações <span className="font-medium text-brand-2">+22%</span>
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold">{actions.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted">
              Contatos e rotas <span className="font-medium text-brand-2">+15%</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-end gap-1.5">
        {BARS.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-t bg-brand/70 transition-all duration-700 ease-out"
            style={{
              height: run ? `${h}px` : "6px",
              transitionDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
