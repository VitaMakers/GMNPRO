"use client";

import { useState } from "react";

interface Item {
  thumbnailUrl: string | null;
  createTime: string | null;
}

export default function GalleryVerifier({
  locations,
}: {
  locations: { location_name: string; title: string | null }[];
}) {
  const [location, setLocation] = useState(locations[0]?.location_name ?? "");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

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
      setTotal(data.total);
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {locations.map((l) => (
            <option key={l.location_name} value={l.location_name}>
              {l.title ?? l.location_name}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading || !location}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Carregando…" : "Carregar galeria"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {items && (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted">
            {total} foto{total !== 1 ? "s" : ""} na galeria deste perfil.
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma foto encontrada.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {items.map((it, i) =>
                it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={it.thumbnailUrl}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                    title={it.createTime ? new Date(it.createTime).toLocaleString("pt-BR") : ""}
                  />
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
