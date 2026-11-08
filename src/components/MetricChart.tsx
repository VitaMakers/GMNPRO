"use client";

import { useRef, useState } from "react";

interface Point {
  date: string;
  value: number;
}

export default function MetricChart({ data, label }: { data: Point[]; label: string }) {
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
  const x = (i: number) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;

  const gridVals = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  // Rótulos de data (no máx. 5)
  const step = Math.max(1, Math.floor(data.length / 5));
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - padL) / plotW) * (data.length - 1));
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
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {Math.round(v)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="var(--brand)" fillOpacity="0.12" />
        <path d={linePath} fill="none" stroke="var(--brand-2)" strokeWidth="2" />

        {data.map((d, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
              {fmt(d.date)}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke="var(--border)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="var(--brand-2)" stroke="var(--background)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}
        >
          <div className="font-medium">{data[hover].value.toLocaleString("pt-BR")}</div>
          <div className="text-muted">{fmt(data[hover].date)}</div>
        </div>
      )}
    </div>
  );
}
