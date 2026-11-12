"use client";

import { useEffect, useRef, useState } from "react";
import { loadLeaflet } from "@/components/LocationsMap";

export type GridMapPoint = {
  lat: number;
  lng: number;
  rank: number | null;
  top?: { title: string; rank: number; rating: number | null; reviews: number | null; me: boolean }[];
};

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export function rankColor(rank: number | null) {
  if (rank == null) return "#6b7280"; // cinza — fora do top 20
  if (rank <= 3) return "#059669"; // verde
  if (rank <= 10) return "#d97706"; // amarelo
  return "#dc2626"; // vermelho
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function GridMap({
  points,
  center,
  title,
}: {
  points: GridMapPoint[];
  center: { lat: number; lng: number };
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !ref.current) return;
        if (!mapRef.current) {
          mapRef.current = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
          L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(mapRef.current);
        }
        const map = mapRef.current;
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        const bounds: [number, number][] = [];
        for (const p of points) {
          const color = rankColor(p.rank);
          const label = p.rank == null ? "20+" : String(p.rank);
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:32px;height:32px;border-radius:9999px;background:${color};color:#fff;display:grid;place-items:center;font:700 12px/1 system-ui;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.35)">${label}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const mk = L.marker([p.lat, p.lng], { icon }).addTo(map);
          const rows = (p.top ?? [])
            .map(
              (t) =>
                `<div style="display:flex;gap:6px;align-items:center;padding:2px 0;${t.me ? "font-weight:700;color:#059669" : ""}">
                  <span style="width:18px;text-align:right">${t.rank}.</span>
                  <span style="flex:1">${esc(t.title)}</span>
                  ${t.rating != null ? `<span style="color:#6b7280;font-size:11px">${t.rating} ★ (${t.reviews ?? 0})</span>` : ""}
                </div>`,
            )
            .join("");
          mk.bindPopup(
            `<div style="min-width:220px;font:12px system-ui"><div style="font-weight:700;margin-bottom:4px">Sua posição aqui: ${label}</div>${rows || "<div style='color:#6b7280'>Sem resultados neste ponto.</div>"}</div>`,
          );
          bounds.push([p.lat, p.lng]);
        }
        // Pino da empresa no centro.
        const pin = L.divIcon({
          className: "",
          html: `<svg width="30" height="40" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 12.6 21.1 13.1 21.6.5.5 1.3.5 1.8 0C15.4 35.1 28 23.8 28 14 28 6.3 21.7 0 14 0z" fill="#111827"/><circle cx="14" cy="14" r="5.2" fill="#fff"/></svg>`,
          iconSize: [30, 40],
          iconAnchor: [15, 40],
          popupAnchor: [0, -36],
        });
        const m = L.marker([center.lat, center.lng], { icon: pin, zIndexOffset: 2000 }).addTo(map);
        if (title) m.bindPopup(`<strong>${title.replace(/</g, "&lt;")}</strong>`);
        bounds.push([center.lat, center.lng]);

        if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
        else map.setView([center.lat, center.lng], 14);
        setTimeout(() => map.invalidateSize(), 100);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [points, center, title]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  if (failed) {
    return <div className="grid min-h-[380px] place-items-center rounded-2xl border border-border bg-surface-2 text-sm text-muted">Não foi possível carregar o mapa.</div>;
  }
  return <div ref={ref} className="h-[420px] w-full rounded-2xl" />;
}
