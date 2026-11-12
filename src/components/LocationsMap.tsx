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
function loadLeaflet(): Promise<unknown> {
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

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function LocationsMap({ points }: { points: MapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (points.length === 0) return;

    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !ref.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          }).addTo(mapRef.current);
          L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(mapRef.current);
        }

        const map = mapRef.current;
        // Limpa marcadores antigos.
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.CircleMarker) map.removeLayer(layer);
        });

        const bounds: [number, number][] = [];
        for (const p of points) {
          const color = p.active ? "#059669" : "#2563eb";
          const marker = L.circleMarker([p.lat, p.lng], {
            radius: p.active ? 10 : 7,
            color: "#fff",
            weight: 2,
            fillColor: color,
            fillOpacity: 1,
          }).addTo(map);
          marker.bindPopup(
            `<strong>${escapeHtml(p.title)}</strong>${p.detail ? `<br/>${escapeHtml(p.detail)}` : ""}`,
          );
          if (p.active) marker.openPopup();
          bounds.push([p.lat, p.lng]);
        }

        if (bounds.length === 1) {
          map.setView(bounds[0], 15);
        } else {
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
  }, [points]);

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

  return <div ref={ref} className="h-full min-h-[280px] w-full rounded-2xl" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
