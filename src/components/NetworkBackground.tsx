"use client";

import { useEffect, useRef } from "react";

interface Pt { x: number; y: number }
interface Path { p0: Pt; p1: Pt; p2: Pt; p3: Pt }
interface Particle { path: number; t: number; speed: number; color: string; size: number }
interface Hub { x: number; y: number; r: number; color: string }

const COLORS = ["#34d399", "#10b981", "#22d3ee", "#f5b941"];

function bezier(p: Path, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * p.p0.x + b * p.p1.x + c * p.p2.x + d * p.p3.x,
    y: a * p.p0.y + b * p.p1.y + c * p.p2.y + d * p.p3.y,
  };
}

export default function NetworkBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let paths: Path[] = [];
    let particles: Particle[] = [];
    let hubs: Hub[] = [];
    let raf = 0;

    function build() {
      const rect = canvas!.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas!.width = W * dpr; canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Curvas atravessando a tela (da esquerda para a direita, arqueadas).
      const n = Math.max(5, Math.round(W / 220));
      paths = [];
      for (let i = 0; i < n; i++) {
        const y0 = H * (0.2 + 0.6 * Math.random());
        const y1 = H * (0.2 + 0.6 * Math.random());
        const lift = H * (0.1 + 0.25 * Math.random());
        paths.push({
          p0: { x: -40, y: y0 },
          p1: { x: W * 0.33, y: y0 - lift },
          p2: { x: W * 0.66, y: y1 - lift },
          p3: { x: W + 40, y: y1 },
        });
      }

      // Hubs grandes (parados) em pontos ao longo das curvas.
      hubs = [];
      for (const p of paths) {
        const t = 0.45 + Math.random() * 0.4;
        const at = bezier(p, t);
        hubs.push({ x: at.x, y: at.y, r: 5 + Math.random() * 4, color: COLORS[Math.floor(Math.random() * 2)] });
      }

      // Partículas pequenas em movimento.
      particles = [];
      const per = reduce ? 1 : 5;
      paths.forEach((_, pi) => {
        for (let k = 0; k < per; k++) {
          particles.push({
            path: pi,
            t: Math.random(),
            speed: 0.0006 + Math.random() * 0.0012,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 1.4 + Math.random() * 1.6,
          });
        }
      });
    }

    function frame() {
      ctx!.clearRect(0, 0, W, H);

      // Linhas das curvas (bem sutis).
      ctx!.lineWidth = 1;
      for (const p of paths) {
        ctx!.beginPath();
        ctx!.moveTo(p.p0.x, p.p0.y);
        ctx!.bezierCurveTo(p.p1.x, p.p1.y, p.p2.x, p.p2.y, p.p3.x, p.p3.y);
        ctx!.strokeStyle = "rgba(52,211,153,0.10)";
        ctx!.setLineDash([2, 6]);
        ctx!.stroke();
      }
      ctx!.setLineDash([]);

      // Hubs parados com brilho.
      for (const h of hubs) {
        const g = ctx!.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r * 4);
        g.addColorStop(0, h.color + "55");
        g.addColorStop(1, "transparent");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(h.x, h.y, h.r * 4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = h.color;
        ctx!.beginPath();
        ctx!.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Partículas em movimento.
      for (const pt of particles) {
        if (!reduce) {
          pt.t += pt.speed;
          if (pt.t > 1) pt.t -= 1;
        }
        const at = bezier(paths[pt.path], pt.t);
        ctx!.fillStyle = pt.color;
        ctx!.globalAlpha = 0.9;
        ctx!.beginPath();
        ctx!.arc(at.x, at.y, pt.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(frame);
    }

    build();
    frame();
    const onResize = () => { build(); if (reduce) frame(); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
