"use client";

import { useRef, useState } from "react";

interface Point {
  date: string;
  value: number;
}

/**
 * variant "line" (padrão): linha com área.
 * variant "bars": barras com degradê + linha suave da média móvel de 7 dias,
 *   desenhado para ficar sobre um painel ESCURO (cores claras no eixo e na linha).
 */
export default function MetricChart({ data, label, variant = "line" }: { data: Point[]; label: string; variant?: "line" | "bars" }) {
  const bars = variant === "bars";
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const W = 760;
  const H = 240;
  const padL = 44;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  if (data.length === 0) {
    return <p className="text-sm text-muted">Sem dados no período.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 4) * 4;
  // Barras: cada dia ocupa uma faixa e o ponto fica no centro dela.
  const band = plotW / data.length;
  const x = (i: number) =>
    bars ? padL + band * (i + 0.5) : padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;

  const gridVals = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  // Média móvel de 7 dias (dias anteriores + o próprio), em curva suave.
  const avg = data.map((_, i) => {
    const win = data.slice(Math.max(0, i - 6), i + 1);
    return win.reduce((t, d) => t + d.value, 0) / win.length;
  });
  const smoothPath = (() => {
    const pts = avg.map((v, i) => [x(i), y(v)] as [number, number]);
    if (pts.length < 2) return "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
  })();
  const barW = Math.max(2, Math.min(30, band * 0.56));

  // Rótulos de data (no máx. 5)
  const step = Math.max(1, Math.floor(data.length / 5));
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = bars ? Math.floor((px - padL) / band) : Math.round(((px - padL) / plotW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={label}
      >
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={bars ? "rgba(255,255,255,0.16)" : "var(--border)"} strokeWidth="1" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={bars ? "rgba(255,255,255,0.6)" : "var(--muted)"}>
              {Math.round(v)}
            </text>
          </g>
        ))}

        {bars ? (
          <>
            <defs>
              <linearGradient id="mc-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2fe3d1" />
                <stop offset="55%" stopColor="#14a79b" />
                <stop offset="100%" stopColor="#0b5f78" />
              </linearGradient>
              <filter id="mc-shadow" x="-30%" y="-10%" width="160%" height="130%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.28" />
              </filter>
            </defs>
            <g filter="url(#mc-shadow)">
              {data.map((d, i) => {
                const h = Math.max(d.value > 0 ? 2 : 0, padT + plotH - y(d.value));
                return (
                  <rect key={i} x={x(i) - barW / 2} y={padT + plotH - h} width={barW} height={h} rx="1"
                    fill="url(#mc-bar)" opacity={hover === null || hover === i ? 1 : 0.6} />
                );
              })}
            </g>
            <path d={smoothPath} fill="none" stroke="#ffffff" strokeWidth="1.3" strokeOpacity="0.95" />
            {data.length <= 45 && avg.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="2" fill="#ffffff" />
            ))}
          </>
        ) : (
          <>
            <path d={areaPath} fill="var(--brand)" fillOpacity="0.12" />
            <path d={linePath} fill="none" stroke="var(--brand-2)" strokeWidth="2" />
          </>
        )}

        {data.map((d, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={bars ? "rgba(255,255,255,0.6)" : "var(--muted)"}>
              {fmt(d.date)}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke={bars ? "rgba(255,255,255,0.35)" : "var(--border)"} strokeWidth="1" />
            {!bars && <circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="var(--brand-2)" stroke="var(--background)" strokeWidth="2" />}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}
        >
          <div className="font-medium">{data[hover].value.toLocaleString("pt-BR")}</div>
          {bars && <div className="text-muted">média 7 dias: {avg[hover].toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</div>}
          <div className="text-muted">{fmt(data[hover].date)}</div>
        </div>
      )}

    </div>
  );
}
