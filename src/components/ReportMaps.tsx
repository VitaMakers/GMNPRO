"use client";

import { useEffect, useRef, useState } from "react";
import { loadLeaflet, loadHeat } from "@/components/LocationsMap";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Top = { title: string; rank: number; me?: boolean; placeId?: string | null; lat?: number | null; lng?: number | null };
type Pt = { lat?: number | null; lng?: number | null; rank: number | null; top?: Top[] };

const SAT_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const STREET_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function greenPin(L: any) {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="40" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 12.6 21.1 13.1 21.6.5.5 1.3.5 1.8 0C15.4 35.1 28 23.8 28 14 28 6.3 21.7 0 14 0z" fill="#0e9f6e"/><circle cx="14" cy="14" r="5.2" fill="#fff"/></svg>`,
    iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -34],
  });
}
function bluePin(L: any) {
  return L.divIcon({
    className: "",
    html: `<svg width="22" height="30" viewBox="0 0 28 36" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 12.6 21.1 13.1 21.6.5.5 1.3.5 1.8 0C15.4 35.1 28 23.8 28 14 28 6.3 21.7 0 14 0z" fill="#2563eb"/><circle cx="14" cy="14" r="4.6" fill="#fff"/></svg>`,
    iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -26],
  });
}
const escH = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Reúne os concorrentes (com coordenada) ao longo da grade, 1x cada. */
function competitors(points: Pt[]): { lat: number; lng: number; title: string; best: number }[] {
  const map = new Map<string, { lat: number; lng: number; title: string; best: number }>();
  for (const p of points) {
    for (const t of p.top ?? []) {
      if (t.me) continue;
      if (typeof t.lat !== "number" || typeof t.lng !== "number") continue;
      const k = (t.placeId && t.placeId.trim()) || t.title.toLowerCase();
      const cur = map.get(k);
      if (!cur) map.set(k, { lat: t.lat, lng: t.lng, title: t.title, best: t.rank });
      else if (t.rank < cur.best) cur.best = t.rank;
    }
  }
  return [...map.values()];
}

export default function ReportMaps({
  center, title, keyword, points,
}: {
  center: { lat: number; lng: number };
  title?: string;
  keyword: string;
  points: Pt[];
}) {
  const pinsRef = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L: any = await loadLeaflet();
        if (cancelled) return;

        // ---- Mapa 1: locais (pins) ----
        if (pinsRef.current && !(pinsRef.current as any)._map) {
          const m = L.map(pinsRef.current, { scrollWheelZoom: false, attributionControl: false });
          (pinsRef.current as any)._map = m;
          L.tileLayer(STREET_TILE, { maxZoom: 19 }).addTo(m);
          L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(m);
          const bounds: [number, number][] = [[center.lat, center.lng]];
          for (const c of competitors(points)) {
            L.marker([c.lat, c.lng], { icon: bluePin(L) }).addTo(m).bindPopup(`<strong>${escH(c.title)}</strong><br>melhor posição: ${c.best}`);
            bounds.push([c.lat, c.lng]);
          }
          L.marker([center.lat, center.lng], { icon: greenPin(L), zIndexOffset: 2000 }).addTo(m)
            .bindPopup(`<strong>${escH(title ?? "Seu perfil")}</strong>`);
          if (bounds.length > 1) m.fitBounds(bounds, { padding: [28, 28] });
          else m.setView([center.lat, center.lng], 13);
          setTimeout(() => m.invalidateSize(), 120);
        }

        // ---- Mapa 2: calor sobre satélite ----
        await loadHeat();
        if (cancelled) return;
        if (heatRef.current && !(heatRef.current as any)._map) {
          const m = L.map(heatRef.current, { scrollWheelZoom: false, attributionControl: false });
          (heatRef.current as any)._map = m;
          L.tileLayer(SAT_TILE, { maxZoom: 19 }).addTo(m);
          L.control.attribution({ prefix: false }).addAttribution("© Esri").addTo(m);
          const heatPts = points
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
            .map((p) => {
              const intensity = p.rank == null ? 0.05 : Math.max(0.05, (21 - Math.min(p.rank, 20)) / 20);
              return [p.lat as number, p.lng as number, intensity] as [number, number, number];
            });
          if (heatPts.length) {
            (L as any).heatLayer(heatPts, {
              radius: 44, blur: 32, maxZoom: 17, minOpacity: 0.4,
              gradient: { 0.0: "#2563eb", 0.4: "#f59e0b", 0.7: "#f97316", 1.0: "#16a34a" },
            }).addTo(m);
          }
          L.marker([center.lat, center.lng], { icon: greenPin(L), zIndexOffset: 2000 }).addTo(m);
          const b = points.filter((p) => typeof p.lat === "number").map((p) => [p.lat as number, p.lng as number] as [number, number]);
          b.push([center.lat, center.lng]);
          if (b.length > 1) m.fitBounds(b, { padding: [28, 28] });
          else m.setView([center.lat, center.lng], 13);
          setTimeout(() => m.invalidateSize(), 120);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [center, title, points]);

  useEffect(() => () => {
    for (const r of [pinsRef, heatRef]) {
      const el = r.current as any;
      if (el?._map) { el._map.remove(); el._map = null; }
    }
  }, []);

  if (failed) {
    return <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">Não foi possível carregar os mapas.</div>;
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-semibold text-muted">Mapa de locais na região com a busca “{keyword}”</p>
        <div ref={pinsRef} className="h-[280px] w-full overflow-hidden rounded-xl border border-border" />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-muted">Mapa de calor da região com a busca “{keyword}”</p>
        <div ref={heatRef} className="h-[280px] w-full overflow-hidden rounded-xl border border-border" />
      </div>
    </div>
  );
}
