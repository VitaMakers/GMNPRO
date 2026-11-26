"use client";

import { useEffect, useRef } from "react";
import { loadLeaflet } from "@/components/LocationsMap";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

/**
 * Recriação visual do perfil como aparece no Google (painel do gerenciador
 * + visão geral), montada só com dados reais do perfil. O que a API do
 * Google não fornece (ex.: horários de pico) não é exibido.
 */

const CARD = "#2f3139"; // cartões internos
const TXT = "#e8eaed";
const SUB = "#bdc1c6";
const BLUE = "#a8c7fa";
const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties;

type MediaItem = { thumbnailUrl: string | null; isVideo: boolean };

export interface PerfilGoogleProps {
  bizName: string;
  photoUrl?: string | null;
  verified?: boolean;
  interactions?: number | null;
  score?: number | null;
  rating?: number | null;
  reviews?: number | null;
  category?: string;
  open?: boolean;
  hoursSummary?: string | null;
  address?: string;
  coords?: { lat: number; lng: number } | null;
  media?: MediaItem[];
  showPainel?: boolean;
  showVisao?: boolean;
}

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: any;
    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !ref.current) return;
        map = L.map(ref.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
        const pane = map.getPane("tilePane");
        if (pane) pane.style.filter = "invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)";
        L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
        const pin = L.divIcon({
          className: "",
          html: `<svg width="30" height="40" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 12.6 21.1 13.1 21.6.5.5 1.3.5 1.8 0C15.4 35.1 28 23.8 28 14 28 6.3 21.7 0 14 0z" fill="#ea4335"/><circle cx="14" cy="14" r="5" fill="#7f1d1d"/></svg>`,
          iconSize: [30, 40], iconAnchor: [15, 40],
        });
        L.marker([lat, lng], { icon: pin }).addTo(map);
        map.setView([lat, lng], 15);
        setTimeout(() => map.invalidateSize(), 120);
      })
      .catch(() => {});
    return () => { cancelled = true; if (map) map.remove(); };
  }, [lat, lng]);
  return <div ref={ref} className="h-full min-h-[180px] w-full" />;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span style={{ color: "#fbbc04", letterSpacing: 1 }}>{"★".repeat(full)}<span style={{ color: "#5f6368" }}>{"★".repeat(5 - full)}</span></span>;
}

export default function PerfilGoogle(p: PerfilGoogleProps) {
  const C = 2 * Math.PI * 11;
  const score = p.score ?? null;
  const ringCol = score == null ? "#9aa0a6" : score >= 80 ? "#34a853" : score >= 50 ? "#f9ab00" : "#ea4335";
  const pics = (p.media ?? []).filter((m) => m.thumbnailUrl).slice(0, 4);
  const ratingTxt = p.rating != null ? p.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;

  const Pic = ({ m, className }: { m: MediaItem; className?: string }) => (
    <div className={`relative min-h-0 min-w-0 overflow-hidden ${className ?? ""}`}>
      <img src={m.thumbnailUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {m.isVideo && <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] text-white" style={{ background: "rgba(0,0,0,.6)" }}>▶ vídeo</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ---------- Painel do gerenciador ---------- */}
      {p.showPainel !== false && (
        <div className="rounded-3xl border px-6 py-5" style={{ background: "#ffffff", borderColor: "#e5e7eb", color: "#1f2430", ...exact }}>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full text-xl" style={{ background: "#eef0f3" }}>🏢</div>
              )}
              {p.verified && (
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: "#4285f4", border: "2px solid #ffffff" }}>✓</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[22px] leading-tight" style={{ color: "#1f2430" }}>Sua empresa no Google</p>
              {p.interactions != null && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: "#1a73e8" }}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="#5f6368"><rect x="2" y="8" width="3" height="6" /><rect x="6.5" y="4" width="3" height="10" /><rect x="11" y="10" width="3" height="4" /></svg>
                  {p.interactions.toLocaleString("pt-BR")} interações com clientes
                </p>
              )}
            </div>
            {score != null && (
              <div className="ml-auto shrink-0 text-right">
                <div className="flex items-center justify-end gap-2.5">
                  <span className="text-[15px]" style={{ color: "#1f2430" }}>Força do perfil</span>
                  <svg viewBox="0 0 30 30" width="30" height="30">
                    <circle cx="15" cy="15" r="11" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                    <circle cx="15" cy="15" r="11" fill="none" stroke={ringCol} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 15 15)" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Visão geral ---------- */}
      {p.showVisao !== false && (
        <div className="rounded-3xl px-6 py-5" style={{ background: "#1f1f1f", color: TXT, ...exact }}>
          <p className="text-2xl font-medium leading-tight" style={{ color: "#fff" }}>{p.bizName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: SUB }}>
            {ratingTxt && <span>{ratingTxt} <Stars rating={p.rating ?? 0} /></span>}
            {p.reviews != null && <span style={{ color: BLUE }}>{p.reviews.toLocaleString("pt-BR")} avaliações no Google</span>}
            {p.category && <span>· {p.category}</span>}
            {p.open != null && <span style={{ color: p.open ? "#81c995" : "#f28b82" }}>· {p.open ? "Aberto" : "Fechado"}</span>}
            {p.verified && (
              <span className="inline-flex items-center gap-1.5" style={{ color: TXT }}>
                <span className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: "#4285f4" }}>✓</span>
                Você gerencia este Perfil da Empresa
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr_0.9fr] print:grid-cols-[1.6fr_1fr_0.9fr]">
            {/* Mosaico de fotos */}
            {pics.length > 0 ? (
              <div className="grid h-[240px] grid-cols-2 gap-1 overflow-hidden rounded-2xl" style={{ gridTemplateRows: "minmax(0,1fr)" }}>
                <Pic m={pics[0]} className={pics.length === 1 ? "col-span-2" : ""} />
                {pics.length > 1 && (
                  <div className="grid min-h-0 gap-1" style={{ gridTemplateRows: pics.length > 2 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)" }}>
                    <Pic m={pics[1]} />
                    {pics.length > 2 && (
                      <div className={`grid min-h-0 gap-1 ${pics.length > 3 ? "grid-cols-2" : ""}`}>
                        <Pic m={pics[2]} />
                        {pics.length > 3 && <Pic m={pics[3]} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-[240px] place-items-center rounded-2xl text-sm" style={{ background: CARD, color: SUB }}>Sem fotos no perfil</div>
            )}

            {/* Mapa + endereço */}
            <div className="flex h-[240px] flex-col overflow-hidden rounded-2xl" style={{ background: CARD }}>
              <div className="min-h-0 flex-1">
                {p.coords ? <MiniMap lat={p.coords.lat} lng={p.coords.lng} /> : <div className="grid h-full place-items-center text-2xl">📍</div>}
              </div>
              {p.address && <div className="shrink-0 px-3 py-2"><p className="line-clamp-2 text-[13px] leading-snug" style={{ color: TXT }}>{p.address}</p></div>}
            </div>

            {/* Horário + Avaliações */}
            <div className="flex h-[240px] flex-col gap-3">
              <div className="flex-1 rounded-2xl p-3.5" style={{ background: CARD }}>
                <p className="flex items-center justify-between text-sm" style={{ color: SUB }}><span>Horário</span><span>›</span></p>
                <p className="mt-2 text-[15px] font-medium leading-snug" style={{ color: p.hoursSummary ? "#81c995" : SUB }}>
                  {p.hoursSummary ?? "Horário não informado"}
                </p>
              </div>
              <div className="flex-1 rounded-2xl p-3.5" style={{ background: CARD }}>
                <p className="flex items-center justify-between text-sm" style={{ color: SUB }}><span>Avaliações</span><span>›</span></p>
                {ratingTxt ? (
                  <>
                    <p className="mt-2 text-2xl" style={{ color: "#fff" }}>{ratingTxt} <span className="text-lg"><Stars rating={p.rating ?? 0} /></span></p>
                    {p.reviews != null && <p className="text-xs" style={{ color: SUB }}>{p.reviews.toLocaleString("pt-BR")} avaliações</p>}
                  </>
                ) : <p className="mt-2 text-sm" style={{ color: SUB }}>Sem avaliações</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
