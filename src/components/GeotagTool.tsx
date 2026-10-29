"use client";

import { useCallback, useRef, useState } from "react";
import JSZip from "jszip";
import { geocode, type GeoResult } from "@/lib/geocode";
import { geotagPhoto, toJpgName, type PhotoMeta } from "@/lib/geotag";

interface Photo {
  id: string;
  file: File;
  preview: string;
  meta: PhotoMeta;
}

const ACCEPTED = ["image/jpeg", "image/png"];

function suggestMeta(fileName: string, place: string, niche: string): PhotoMeta {
  const city = place.split(",")[0]?.trim() || place;
  const base = niche.trim() || fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  const title = city ? `${base} — ${city}` : base;
  const description = city
    ? `${base} em ${city}. Veja no nosso perfil do Google.`
    : base;
  const kw = [base, city, "google meu negócio"].filter(Boolean).join(", ");
  return { title, description, keywords: kw };
}

export default function GeotagTool() {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async () => {
    setSearchError("");
    setResults([]);
    setSearching(true);
    try {
      const r = await geocode(query);
      if (r.length === 0) setSearchError("Nenhum local encontrado. Tente ser mais específico.");
      setResults(r);
      if (r.length === 1) setSelected(r[0]);
    } catch {
      setSearchError("Não foi possível buscar a localização agora. Tente de novo.");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const place = selected?.label ?? "";
      const next: Photo[] = [];
      for (const file of Array.from(files)) {
        if (!ACCEPTED.includes(file.type)) continue;
        next.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          preview: URL.createObjectURL(file),
          meta: suggestMeta(file.name, place, niche),
        });
      }
      if (next.length) setPhotos((p) => [...p, ...next]);
    },
    [selected, niche],
  );

  const updateMeta = (id: string, field: keyof PhotoMeta, value: string) => {
    setPhotos((p) =>
      p.map((ph) => (ph.id === id ? { ...ph, meta: { ...ph.meta, [field]: value } } : ph)),
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((p) => {
      const found = p.find((ph) => ph.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return p.filter((ph) => ph.id !== id);
    });
  };

  const handleDownload = useCallback(async () => {
    if (!selected || photos.length === 0) return;
    setProcessing(true);
    setProgress("");
    try {
      const point = { lat: selected.lat, lng: selected.lng };

      if (photos.length === 1) {
        const blob = await geotagPhoto(photos[0].file, point, photos[0].meta);
        triggerDownload(blob, toJpgName(photos[0].file.name));
      } else {
        const zip = new JSZip();
        for (let i = 0; i < photos.length; i++) {
          setProgress(`Processando ${i + 1} de ${photos.length}…`);
          const ph = photos[i];
          const blob = await geotagPhoto(ph.file, point, ph.meta);
          zip.file(toJpgName(ph.file.name), blob);
        }
        setProgress("Gerando arquivo ZIP…");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(zipBlob, "fotos-geotag-gmn-pro.zip");
      }
    } catch {
      setProgress("Algo deu errado ao processar as fotos. Tente de novo.");
      setProcessing(false);
      return;
    }
    setProgress("Pronto! Download iniciado.");
    setProcessing(false);
  }, [selected, photos]);

  return (
    <div className="space-y-8">
      {/* Passo 1 — cidade */}
      <Step n={1} title="Defina a cidade" done={!!selected}>
        <p className="mb-3 text-sm text-muted">
          Digite a cidade (ou endereço) do seu negócio. A ferramenta busca as
          coordenadas automaticamente.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex.: Londrina, PR"
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {searching ? "Buscando…" : "Buscar"}
          </button>
        </div>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Segmento ou nome do negócio (opcional, melhora as sugestões)"
          className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
        {results.length > 0 && (
          <ul className="mt-3 space-y-2">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => setSelected(r)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected?.label === r.label
                      ? "border-brand bg-brand/10"
                      : "border-border bg-surface-2 hover:border-brand/50"
                  }`}
                >
                  <span className="block">{r.label}</span>
                  <span className="text-xs text-muted">
                    {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Step>

      {/* Passo 2 — upload */}
      <Step n={2} title="Suba suas fotos" done={photos.length > 0}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragOver ? "border-brand bg-brand/5" : "border-border bg-surface-2"
          }`}
        >
          <p className="text-sm font-medium">Arraste as fotos aqui ou toque para selecionar</p>
          <p className="mt-1 text-xs text-muted">Aceita JPG e PNG — em lote</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      </Step>

      {/* Passo 3 — metadados */}
      {photos.length > 0 && (
        <Step n={3} title="Preencha os metadados" done={false}>
          <p className="mb-4 text-sm text-muted">
            Para cada foto, confira título, descrição e palavras-chave. A
            ferramenta já sugere automaticamente — ajuste como quiser.
          </p>
          <div className="space-y-4">
            {photos.map((ph) => (
              <div
                key={ph.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:flex-row"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ph.preview}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg object-cover"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted">{ph.file.name}</span>
                    <button
                      onClick={() => removePhoto(ph.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                  <input
                    value={ph.meta.title}
                    onChange={(e) => updateMeta(ph.id, "title", e.target.value)}
                    placeholder="Título"
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    value={ph.meta.description}
                    onChange={(e) => updateMeta(ph.id, "description", e.target.value)}
                    placeholder="Descrição"
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    value={ph.meta.keywords}
                    onChange={(e) => updateMeta(ph.id, "keywords", e.target.value)}
                    placeholder="Palavras-chave (separadas por vírgula)"
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>
            ))}
          </div>
        </Step>
      )}

      {/* Passo 4 — download */}
      <Step n={4} title="Baixe o resultado" done={false}>
        <p className="mb-3 text-sm text-muted">
          As fotos saem no mesmo enquadramento, sem corte, com geotag e EXIF
          prontas para subir no GMB.
        </p>
        <button
          onClick={handleDownload}
          disabled={!selected || photos.length === 0 || processing}
          className="rounded-lg bg-brand-2 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {processing
            ? "Processando…"
            : photos.length > 1
              ? `Baixar ${photos.length} fotos (ZIP)`
              : "Baixar foto"}
        </button>
        {!selected && (
          <p className="mt-2 text-xs text-accent">Defina a cidade no passo 1 primeiro.</p>
        )}
        {progress && <p className="mt-2 text-sm text-muted">{progress}</p>}
      </Step>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${
            done ? "bg-brand-2 text-white" : "bg-surface-2 text-muted"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
