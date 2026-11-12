"use client";

import { useEffect, useRef, useState } from "react";

export type MapPoint = {
  title: string;
  lat: number;
  lng: number;
  active?: boolean;
  detail?: string;
};

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// Carrega o Leaflet uma única vez (via CDN).
let leafletPromise: Promise<unknown> | null = null;
export function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject();
  const w = window as unknown as { L?: unknown };
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve((window as unknown as { L: unknown }).L);
    script.onerror = () => reject(new Error("leaflet"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const HEAT_JS = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
let heatPromise: Promise<void> | null = null;
function loadHeat(): Promise<void> {
  const w = window as unknown as { L?: { heatLayer?: unknown } };
  if (w.L?.heatLayer) return Promise.resolve();
  if (heatPromise) return heatPromise;
  heatPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = HEAT_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("heat"));
    document.head.appendChild(script);
  });
  return heatPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function LocationsMap({
  points,
  mode = "pins",
  height = 320,
}: {
  points: MapPoint[];
  mode?: "pins" | "heat";
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (points.length === 0) return;

    loadLeaflet()
      .then(async (L: any) => {
        if (mode === "heat") await loadHeat().catch(() => undefined);
        if (cancelled || !ref.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          }).addTo(mapRef.current);
          L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(mapRef.current);
        }

        const map = mapRef.current;
        // Limpa marcadores/camadas antigas.
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer._heat) map.removeLayer(layer);
        });

        const bounds: [number, number][] = [];
        if (mode === "heat" && L.heatLayer) {
          L.heatLayer(
            points.map((p) => [p.lat, p.lng, p.active ? 1 : 0.7]),
            { radius: 35, blur: 25, maxZoom: 12, minOpacity: 0.35 },
          ).addTo(map);
          for (const p of points) bounds.push([p.lat, p.lng]);
          const act = points.find((p) => p.active);
          if (act) {
            const icon = L.divIcon({ className: "", html: pinSvg("#059669", true), iconSize: [34, 44], iconAnchor: [17, 44] });
            L.marker([act.lat, act.lng], { icon, zIndexOffset: 1000 }).addTo(map).bindPopup(`<strong>${escapeHtml(act.title)}</strong>`);
          }
        } else
        for (const p of points) {
          const color = p.active ? "#059669" : "#2563eb";
          const icon = L.divIcon({
            className: "",
            html: pinSvg(color, !!p.active),
            iconSize: [p.active ? 34 : 28, p.active ? 44 : 36],
            iconAnchor: [p.active ? 17 : 14, p.active ? 44 : 36],
            popupAnchor: [0, p.active ? -40 : -32],
          });
          const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: p.active ? 1000 : 0 }).addTo(map);
          marker.bindPopup(
            `<strong>${escapeHtml(p.title)}</strong>${p.detail ? `<br/>${escapeHtml(p.detail)}` : ""}`,
          );
          if (p.active) marker.openPopup();
          bounds.push([p.lat, p.lng]);
        }

        if (bounds.length === 1) {
          map.setView(bounds[0], 15);
        } else if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
        setTimeout(() => map.invalidateSize(), 100);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [points, mode]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (failed) {
    return (
      <div className="grid h-full min-h-[280px] place-items-center rounded-2xl border border-border bg-surface-2 text-sm text-muted">
        Não foi possível carregar o mapa agora.
      </div>
    );
  }

  return <div ref={ref} className="w-full rounded-2xl" style={{ height }} />;
}

// Pino teardrop (igual ao do Google Maps), com sombra.
function pinSvg(color: string, active: boolean): string {
  const w = active ? 34 : 28;
  const h = active ? 44 : 36;
  return `<svg width="${w}" height="${h}" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 12.6 21.1 13.1 21.6.5.5 1.3.5 1.8 0C15.4 35.1 28 23.8 28 14 28 6.3 21.7 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="5.2" fill="#fff"/>
  </svg>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
