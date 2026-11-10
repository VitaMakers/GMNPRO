"use client";

import { useEffect, useState } from "react";

function useCount(target: number, ms = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const BARS = [38, 58, 50, 72, 64, 82, 90];

export default function MockPerformance() {
  const views = useCount(4820);
  const actions = useCount(612);
  const pct = 68;

  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <p className="text-sm font-semibold">Desempenho · últimos 30 dias</p>

      <div className="mt-5 flex items-center gap-6">
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
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
            className="fadeup flex-1 rounded-t bg-brand/70"
            style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
