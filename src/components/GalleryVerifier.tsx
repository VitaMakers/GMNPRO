"use client";

import { useEffect, useState } from "react";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";

interface Item {
  thumbnailUrl: string | null;
  createTime: string | null;
  isVideo: boolean;
  views: number;
}

interface Totals {
  total: number;
  photoCount: number;
  videoCount: number;
  photoViews: number;
  videoViews: number;
  totalViews: number;
}

const nf = (n: number) => n.toLocaleString("pt-BR");

export default function GalleryVerifier({
  locations,
}: {
  locations: { location_name: string; title: string | null }[];
}) {
  const active = useActiveProfile();
  const location = active ?? locations[0]?.location_name ?? "";
  const locationTitle = locations.find((l) => l.location_name === location)?.title ?? "perfil";
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (locations[0]) initActiveProfile(locations[0].location_name);
  }, [locations]);

  // Ao trocar de perfil no topo, limpa a galeria carregada.
  useEffect(() => {
    setItems(null);
    setTotals(null);
    setError("");
  }, [location]);

  async function load() {
    if (!location) return;
    setLoading(true);
    setError("");
    setItems(null);
    try {
      const res = await fetch(`/api/google/list-media?location=${encodeURIComponent(location)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setItems(data.items);
      setTotals({
        total: data.total,
        photoCount: data.photoCount ?? 0,
        videoCount: data.videoCount ?? 0,
        photoViews: data.photoViews ?? 0,
        videoViews: data.videoViews ?? 0,
        totalViews: data.totalViews ?? 0,
      });
    } catch (e) {
      setError(`Não foi possível carregar: ${e instanceof Error ? e.message : "erro"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Confirmar fotos na galeria do Google</h2>
      <p className="mb-4 text-sm text-muted">
        Veja, direto do Google, as fotos que estão na galeria deste perfil.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="inline-flex flex-1 items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {locationTitle}
        </span>
        <button
          onClick={load}
          disabled={loading || !location}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Carregando…" : "Carregar galeria"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {items && totals && (
        <div className="mt-4">
          {/* Resumo da galeria */}
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface-2 p-3">
              <p className="text-xl font-bold">{nf(totals.photoCount)}</p>
              <p className="text-xs text-muted">Imagens</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-2 p-3">
              <p className="text-xl font-bold">{nf(totals.videoCount)}</p>
              <p className="text-xs text-muted">Vídeos</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-2 p-3">
              <p className="text-xl font-bold">{nf(totals.total)}</p>
              <p className="text-xs text-muted">Mídias na galeria</p>
            </div>
            {totals.totalViews > 0 && (
              <div className="rounded-2xl border border-border bg-surface-2 p-3">
                <p className="text-xl font-bold">{nf(totals.totalViews)}</p>
                <p className="text-xs text-muted">Visualizações no total</p>
              </div>
            )}
          </div>

          {totals.totalViews > 0 && (
            <p className="mb-2 text-xs text-muted">
              As visualizações por mídia são o total acumulado desde a publicação.
            </p>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma foto encontrada.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {items.map((it, i) =>
                it.thumbnailUrl ? (
                  <div key={i} className="relative overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.thumbnailUrl}
                      alt=""
                      className="aspect-square w-full object-cover"
                      title={it.createTime ? new Date(it.createTime).toLocaleString("pt-BR") : ""}
                    />
                    {it.isVideo && (
                      <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    )}
                    {it.views > 0 && (
                      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[11px] font-medium text-white">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {nf(it.views)}
                      </span>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
