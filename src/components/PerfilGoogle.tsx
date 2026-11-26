"use client";

import { useEffect, useRef } from "react";
import { loadLeaflet } from "@/components/LocationsMap";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

/**
 * Recriação visual do perfil como aparece no Google (painel do gerenciador
 * + visão geral), montada só com dados reais do perfil. O que a API do
 * Google não fornece (ex.: horários de pico) não é exibido.
 */

const BG = "#25272f"; // fundo dos painéis
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

const I = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const ACTIONS: { t: string; icon: React.ReactNode }[] = [
  { t: "Editar perfil", icon: <I><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></I> },
  { t: "Ler avaliações", icon: <I><path d="M4 4h16v12H8l-4 4V4z" /><path d="M12 6.8l1 2.1 2.3.2-1.7 1.5.5 2.2-2.1-1.2-2.1 1.2.5-2.2-1.7-1.5 2.3-.2z" /></I> },
  { t: "Fotos", icon: <I><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M4 16l4.5-5 3.5 4 2.5-3 5.5 6" /></I> },
  { t: "Posts", icon: <I><path d="M14 5H5v14h12v-8" /><path d="M8 10h5M8 13h6M8 16h4" /><path d="M18 3v6M15 6h6" /></I> },
  { t: "Desempenho", icon: <I><path d="M4 17l5-5 3 3 4-5 4 3" /><path d="M6 5v2M5 6h2M18 4v2M17 5h2" /></I> },
  { t: "Anunciar", icon: <I><path d="M4 16l5-5 4 4 7-8" /><path d="M15 7h5v5" /></I> },
  { t: "Editar produtos", icon: <I><path d="M6 8h12v12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></I> },
  { t: "Editar serviços", icon: <I><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M8 9h.5M11 9h5M8 12h.5M11 12h5M8 15h.5M11 15h5" /></I> },
  { t: "Agendamentos", icon: <I><rect x="5" y="6" width="14" height="14" rx="1.5" /><path d="M5 10h14M9 4v4M15 4v4" /><rect x="13" y="14" width="3" height="3" fill={BLUE} stroke="none" /></I> },
  { t: "Solicitar avaliações", icon: <I><path d="M4 4h16v12H8l-4 4V4z" /><path d="M9.5 12.5v-2l4.5-4.5 2 2-4.5 4.5h-2z" /></I> },
];

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: any;
    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !ref.current) return;
        map = L.map(ref.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd" }).addTo(map);
        L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap · CARTO").addTo(map);
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
  const statusTxt = score == null ? "" : score >= 80 ? "Tudo certo!" : score >= 50 ? "Quase lá" : "Precisa de atenção";
  const ringCol = score == null ? "#5f6368" : score >= 80 ? "#81c995" : score >= 50 ? "#fdd663" : "#f28b82";
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
        <div className="rounded-3xl px-6 py-5" style={{ background: BG, color: TXT, ...exact }}>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full text-xl" style={{ background: CARD }}>🏢</div>
              )}
              {p.verified && (
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: "#4285f4", border: `2px solid ${BG}` }}>✓</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[22px] leading-tight" style={{ color: TXT }}>Sua empresa no Google</p>
              {p.interactions != null && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: BLUE }}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill={SUB}><rect x="2" y="8" width="3" height="6" /><rect x="6.5" y="4" width="3" height="10" /><rect x="11" y="10" width="3" height="4" /></svg>
                  {p.interactions.toLocaleString("pt-BR")} interações com clientes
                </p>
              )}
            </div>
            {score != null && (
              <div className="ml-auto shrink-0 text-right">
                <div className="flex items-center justify-end gap-2.5">
                  <span className="text-[15px]" style={{ color: TXT }}>Força do perfil</span>
                  <svg viewBox="0 0 30 30" width="30" height="30">
                    <circle cx="15" cy="15" r="11" fill="none" stroke="#3c4043" strokeWidth="5" />
                    <circle cx="15" cy="15" r="11" fill="none" stroke={ringCol} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 15 15)" />
                  </svg>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: TXT }}>{statusTxt}</p>
              </div>
            )}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-6">
            {ACTIONS.map((a) => (
              <div key={a.t} className="min-w-0 text-center">
                <div className="mx-auto mb-1.5 grid h-8 place-items-center">{a.icon}</div>
                <p className="truncate text-[13px] font-medium" style={{ color: TXT }}>{a.t}</p>
              </div>
            ))}
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
