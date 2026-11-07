"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import Link from "next/link";
import { geocode, type GeoResult } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/client";
import {
  geotagPhoto,
  isLowResolution,
  slugJpgName,
  type PhotoMeta,
} from "@/lib/geotag";

interface GmbLocation {
  location_name: string;
  title: string | null;
}

interface Photo {
  id: string;
  file: File;
  preview: string;
  meta: PhotoMeta;
  blob?: Blob;
  outW?: number;
  outH?: number;
  ready: boolean;
  scheduleWhen?: string;
  act?: "sending" | "published" | "scheduled" | "error";
  actKind?: "publish" | "schedule";
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function suggestMeta(fileName: string, place: string, niche: string): PhotoMeta {
  const city = place.split(",")[0]?.trim() || place;
  const segment = niche.trim();
  const base = segment || fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

  // Título: palavra-chave principal primeiro (padrão de SEO local).
  const title = city ? `${base} em ${city}` : base;

  // Descrição rica em palavras-chave, mas natural.
  const description = city
    ? `${base} em ${city}. Conheça nossos serviços, veja fotos e avaliações e fale com a gente pelo nosso perfil no Google. Atendimento em ${city} e região.`
    : `${base}. Veja fotos, avaliações e contato no nosso perfil do Google Meu Negócio.`;

  // Palavras-chave: variações de busca local, sem repetição.
  const kwList = [
    base,
    city && `${base} em ${city}`,
    city && `${base} ${city}`,
    `${base} perto de mim`,
    city && `melhor ${base} em ${city}`,
    city,
    "google meu negócio",
  ].filter(Boolean) as string[];
  const keywords = Array.from(new Set(kwList.map((k) => k.toLowerCase()))).join(", ");

  return { title, description, keywords };
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
  const [done, setDone] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [optimize, setOptimize] = useState(true);
  const [enhance, setEnhance] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Integração com a conta (publicar/programar na galeria do GMB)
  const [loggedIn, setLoggedIn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [locations, setLocations] = useState<GmbLocation[]>([]);
  const [gmbLocation, setGmbLocation] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setLoggedIn(true);
      const { data: conn } = await supabase
        .from("google_connections")
        .select("access_token")
        .maybeSingle();
      setConnected(!!conn?.access_token);
      const { data: locs } = await supabase
        .from("gmb_locations")
        .select("location_name, title")
        .order("title", { ascending: true });
      const list = (locs as GmbLocation[]) ?? [];
      setLocations(list);
      if (list.length > 0) setGmbLocation(list[0].location_name);
    })();
  }, []);

  const uploadToStorage = useCallback(async (blob: Blob, name: string): Promise<string> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada. Entre novamente.");
    const path = `${user.id}/${crypto.randomUUID()}-${name}`;
    const { error } = await supabase.storage.from("post-media").upload(path, blob, {
      contentType: "image/jpeg",
    });
    if (error) throw error;
    return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
  }, []);

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
      let heicCount = 0;
      let otherRejected = 0;
      for (const file of Array.from(files)) {
        if (!ACCEPTED.includes(file.type)) {
          if (isHeic(file)) heicCount++;
          else otherRejected++;
          continue;
        }
        next.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          preview: URL.createObjectURL(file),
          meta: suggestMeta(file.name, place, niche),
          ready: false,
        });
      }
      if (next.length) {
        setPhotos((p) => [...p, ...next]);
        setDone(false);
        setProgress("");
      }

      const msgs: string[] = [];
      if (heicCount > 0) {
        msgs.push(
          `${heicCount} foto(s) em HEIC (formato do iPhone) não puderam ser lidas. No iPhone, ative Ajustes → Câmera → Formatos → "Mais compatível", ou converta para JPG antes de subir.`,
        );
      }
      if (otherRejected > 0) {
        msgs.push(`${otherRejected} arquivo(s) ignorado(s): aceita apenas JPG, PNG ou WEBP.`);
      }
      setUploadNotice(msgs.join(" "));
    },
    [selected, niche],
  );

  // Impede o navegador de abrir a imagem quando ela é solta fora da área exata.
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const updateMeta = (id: string, field: keyof PhotoMeta, value: string) => {
    setPhotos((p) =>
      p.map((ph) =>
        ph.id === id ? { ...ph, meta: { ...ph.meta, [field]: value }, blob: undefined, ready: false } : ph,
      ),
    );
    setDone(false);
  };

  const resetProcessed = () => {
    setPhotos((p) => p.map((ph) => ({ ...ph, blob: undefined, ready: false })));
    setDone(false);
  };

  const regenerateSuggestions = () => {
    const place = selected?.label ?? "";
    setPhotos((p) =>
      p.map((ph) => ({ ...ph, meta: suggestMeta(ph.file.name, place, niche) })),
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((p) => {
      const found = p.find((ph) => ph.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return p.filter((ph) => ph.id !== id);
    });
  };

  const bake = useCallback(
    async (photo: Photo): Promise<Blob> => {
      const point = { lat: selected!.lat, lng: selected!.lng };
      const { blob, width, height } = await geotagPhoto(photo.file, point, photo.meta, {
        optimize,
        enhance,
      });
      setPhotos((p) =>
        p.map((ph) =>
          ph.id === photo.id ? { ...ph, blob, outW: width, outH: height, ready: true } : ph,
        ),
      );
      return blob;
    },
    [selected, optimize, enhance],
  );

  const setAct = useCallback((id: string, act: Photo["act"]) => {
    setPhotos((p) => p.map((x) => (x.id === id ? { ...x, act } : x)));
  }, []);

  const publishNow = useCallback(
    async (photo: Photo) => {
      if (!gmbLocation) {
        setActionMsg({ type: "err", text: "Nenhum local do GMB selecionado." });
        return;
      }
      setBusyId(photo.id);
      setPhotos((p) => p.map((x) => (x.id === photo.id ? { ...x, act: "sending", actKind: "publish" } : x)));
      setActionMsg(null);
      try {
        const blob = photo.blob ?? (await bake(photo));
        const mediaUrl = await uploadToStorage(blob, slugJpgName(photo.meta.title, photo.file.name));
        const res = await fetch("/api/google/publish-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationName: gmbLocation, mediaUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "falha");
        setAct(photo.id, "published");
        setActionMsg({ type: "ok", text: "Foto publicada na galeria! Pode levar alguns minutos para aparecer." });
        setTimeout(() => removePhoto(photo.id), 1400);
      } catch (e) {
        setAct(photo.id, "error");
        setActionMsg({ type: "err", text: `Não foi possível publicar: ${e instanceof Error ? e.message : "erro"}` });
      } finally {
        setBusyId(null);
      }
    },
    [gmbLocation, bake, uploadToStorage, setAct],
  );

  const schedulePhoto = useCallback(
    async (photo: Photo, when: string) => {
      if (!gmbLocation) {
        setActionMsg({ type: "err", text: "Nenhum local do GMB selecionado." });
        return;
      }
      if (!when) {
        setActionMsg({ type: "err", text: "Escolha a data e a hora." });
        return;
      }
      setBusyId(photo.id);
      setPhotos((p) => p.map((x) => (x.id === photo.id ? { ...x, act: "sending", actKind: "schedule" } : x)));
      setActionMsg(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão expirada.");
        const blob = photo.blob ?? (await bake(photo));
        const mediaUrl = await uploadToStorage(blob, slugJpgName(photo.meta.title, photo.file.name));
        const { error } = await supabase.from("scheduled_posts").insert({
          user_id: user.id,
          location_name: gmbLocation,
          kind: "photo",
          topic: "STANDARD",
          summary: photo.meta.title || null,
          media_url: mediaUrl,
          scheduled_at: new Date(when).toISOString(),
          status: "scheduled",
        });
        if (error) throw error;
        setAct(photo.id, "scheduled");
        setActionMsg({
          type: "ok",
          text: `Post agendado para ${new Date(when).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Veja no calendário de postagens.`,
        });
        setTimeout(() => removePhoto(photo.id), 1400);
      } catch (e) {
        setAct(photo.id, "error");
        setActionMsg({ type: "err", text: `Não foi possível agendar: ${e instanceof Error ? e.message : "erro"}` });
      } finally {
        setBusyId(null);
      }
    },
    [gmbLocation, bake, uploadToStorage, setAct],
  );

  const processAll = useCallback(async () => {
    if (!selected || photos.length === 0) return;
    setProcessing(true);
    setDone(false);
    try {
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Processando ${i + 1} de ${photos.length}…`);
        await bake(photos[i]);
      }
      setProgress("");
      setDone(true);
    } catch {
      setProgress("Algo deu errado ao processar. Tente de novo.");
    } finally {
      setProcessing(false);
    }
  }, [selected, photos, bake]);

  const downloadOne = useCallback(
    async (photo: Photo) => {
      if (!selected) return;
      const blob = photo.blob ?? (await bake(photo));
      triggerDownload(blob, slugJpgName(photo.meta.title, photo.file.name));
    },
    [selected, bake],
  );

  const downloadZip = useCallback(async () => {
    if (!selected || photos.length === 0) return;
    setProcessing(true);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Preparando ${i + 1} de ${photos.length}…`);
        const ph = photos[i];
        const blob = ph.blob ?? (await bake(ph));
        let name = slugJpgName(ph.meta.title, ph.file.name);
        let n = 2;
        while (used.has(name)) name = name.replace(/\.jpg$/, `-${n++}.jpg`);
        used.add(name);
        zip.file(name, blob);
      }
      setProgress("Gerando ZIP…");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerDownload(zipBlob, "fotos-geotag-gmn-pro.zip");
      setProgress("");
      setDone(true);
    } catch {
      setProgress("Algo deu errado ao gerar o ZIP. Tente de novo.");
    } finally {
      setProcessing(false);
    }
  }, [selected, photos, bake]);

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
            placeholder="Ex.: Sorocaba, SP"
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 ${
              selected ? "bg-brand-2" : "bg-brand"
            }`}
          >
            {selected ? "✓ Local definido" : searching ? "Buscando…" : "Buscar"}
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
        {selected && (
          <p className="mt-3 text-xs text-brand-2">
            ✓ Local definido: {selected.label}
          </p>
        )}
      </Step>

      {/* Passo 2 — upload */}
      <Step n={2} title="Suba suas fotos" done={photos.length > 0}>
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            else
              setUploadNotice(
                "Não consegui ler o que foi solto. Arraste um arquivo de imagem do seu computador, ou clique para selecionar.",
              );
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragOver ? "border-brand bg-brand/5" : "border-border bg-surface-2"
          }`}
        >
          <p className="text-sm font-medium">Arraste as fotos aqui ou toque para selecionar</p>
          <p className="mt-1 text-xs text-muted">Aceita JPG, PNG e WEBP — em lote</p>
          {photos.length > 0 && (
            <p className="mt-3 inline-block rounded-full bg-brand-2/15 px-3 py-1 text-xs font-medium text-brand-2">
              ✓ {photos.length} foto{photos.length > 1 ? "s" : ""} carregada{photos.length > 1 ? "s" : ""} — role para baixo
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
        {uploadNotice && (
          <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
            {uploadNotice}
          </p>
        )}
      </Step>

      {/* Passo 3 — metadados por foto */}
      {photos.length > 0 && (
        <Step n={3} title="Metadados de cada foto" done={done}>
          <div className="mb-4 space-y-2 rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium text-muted">Otimização da imagem</p>
            <Toggle
              checked={optimize}
              onChange={(v) => {
                setOptimize(v);
                resetProcessed();
              }}
              label="Otimizar para o Google (recomendado)"
              hint="Ajusta a resolução e gera um JPEG de alta qualidade nas specs do GMB."
            />
            <Toggle
              checked={enhance}
              onChange={(v) => {
                setEnhance(v);
                resetProcessed();
              }}
              label="Melhorar automaticamente"
              hint="Brilho, contraste e nitidez leves para a foto ficar mais profissional."
            />
          </div>
          {connected && locations.length > 0 && (
            <div className="mb-4 rounded-xl border border-brand/30 bg-brand/5 p-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-brand-2">
                  Publicar/agendar na galeria do perfil
                </span>
                <select
                  value={gmbLocation}
                  onChange={(e) => setGmbLocation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  {locations.map((l) => (
                    <option key={l.location_name} value={l.location_name}>
                      {l.title ?? l.location_name}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                href="/agendamento"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2"
              >
                📅 Olhar calendário de postagens
              </Link>
            </div>
          )}
          {loggedIn && !connected && (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-muted">
              Conecte o Google em{" "}
              <Link href="/agendamento" className="font-medium text-brand">Agendamento</Link>{" "}
              para publicar ou agendar fotos direto na galeria do seu perfil.
            </div>
          )}
          {actionMsg && (
            <div
              className={`mb-4 rounded-xl border p-3 text-sm ${
                actionMsg.type === "ok"
                  ? "border-brand-2/40 bg-brand-2/10 text-brand-2"
                  : "border-red-400/40 bg-red-400/10 text-red-400"
              }`}
            >
              {actionMsg.text}
            </div>
          )}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Título, descrição e palavras-chave são gerados para SEO local a partir
              da cidade e do segmento. Ajuste como quiser.
            </p>
            <button
              onClick={regenerateSuggestions}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-brand-2 transition hover:bg-surface-2"
            >
              Gerar sugestões (SEO)
            </button>
          </div>
          <div className="space-y-5">
            {photos.map((ph) => (
              <div key={ph.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="relative mb-3 overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.preview} alt="" className="mx-auto max-h-64 w-full object-contain" />
                  {ph.ready && (
                    <span className="absolute right-2 top-2 rounded-full bg-brand-2 px-2.5 py-1 text-xs font-semibold text-white">
                      Pronta
                    </span>
                  )}
                </div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted">
                    {ph.file.name} · {(ph.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    onClick={() => removePhoto(ph.id)}
                    className="shrink-0 text-xs text-red-400 hover:underline"
                  >
                    Remover
                  </button>
                </div>
                <p className="mb-1 text-xs text-muted">
                  Sai como:{" "}
                  <span className="break-all font-mono text-brand-2">
                    {slugJpgName(ph.meta.title, ph.file.name)}
                  </span>
                </p>
                {ph.ready && ph.blob && (
                  <p className="mb-3 text-xs text-muted">
                    Otimizada: {ph.outW && ph.outH ? `${ph.outW}×${ph.outH}px · ` : ""}
                    {(ph.blob.size / 1024 / 1024).toFixed(2)} MB
                    {isLowResolution(ph.outW ?? 0, ph.outH ?? 0) && (
                      <span className="text-accent"> · resolução baixa — ideal usar fotos maiores</span>
                    )}
                  </p>
                )}
                <Field label="Título">
                  <input
                    value={ph.meta.title}
                    onChange={(e) => updateMeta(ph.id, "title", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </Field>
                <Field label="Descrição">
                  <textarea
                    value={ph.meta.description}
                    onChange={(e) => updateMeta(ph.id, "description", e.target.value)}
                    rows={2}
                    className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </Field>
                <Field label="Palavras-chave (separadas por vírgula)">
                  <input
                    value={ph.meta.keywords}
                    onChange={(e) => updateMeta(ph.id, "keywords", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </Field>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => downloadOne(ph)}
                    disabled={!selected || processing}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 ${
                      ph.ready ? "bg-brand-2" : "bg-brand"
                    }`}
                  >
                    {ph.ready ? "✓ Baixar" : "Baixar"}
                  </button>
                  {connected && locations.length > 0 && (
                    <ActionButton
                      onClick={() => publishNow(ph)}
                      disabled={!selected || busyId === ph.id}
                      sending={ph.act === "sending" && ph.actKind === "publish"}
                      done={ph.act === "published"}
                      idleLabel="Publicar agora"
                      doneLabel="✓ Publicado"
                    />
                  )}
                </div>

                {connected && locations.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="datetime-local"
                      value={ph.scheduleWhen ?? ""}
                      onChange={(e) =>
                        setPhotos((p) =>
                          p.map((x) => (x.id === ph.id ? { ...x, scheduleWhen: e.target.value } : x)),
                        )
                      }
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                    />
                    <div className="w-36 shrink-0">
                      <ActionButton
                        onClick={() => schedulePhoto(ph, ph.scheduleWhen ?? "")}
                        disabled={!selected || busyId === ph.id}
                        sending={ph.act === "sending" && ph.actKind === "schedule"}
                        done={ph.act === "scheduled"}
                        idleLabel="Agendar post"
                        doneLabel="✓ Agendado"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
            <button
              onClick={processAll}
              disabled={!selected || processing}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 ${
                done ? "bg-brand-2" : "bg-brand"
              }`}
            >
              {processing ? "Processando…" : done ? "✓ Fotos processadas" : "Processar fotos"}
            </button>
            <button
              onClick={downloadZip}
              disabled={!selected || processing}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 ${
                done ? "bg-brand-2" : "bg-brand"
              }`}
            >
              Baixar todas (ZIP)
            </button>
          </div>

          {!selected && (
            <p className="mt-3 text-xs text-accent">Defina a cidade no passo 1 primeiro.</p>
          )}
          {progress && <p className="mt-3 text-sm text-muted">{progress}</p>}
          {done && (
            <p className="mt-3 text-sm font-medium text-brand-2">
              Pronto. Suas fotos estão geotaggadas e prontas para o GMB.
            </p>
          )}
        </Step>
      )}
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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-brand-2" : "bg-border"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

function ActionButton({
  onClick,
  disabled,
  sending,
  done,
  idleLabel,
  doneLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  sending: boolean;
  done: boolean;
  idleLabel: string;
  doneLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full overflow-hidden rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 ${
        done ? "bg-brand-2" : "bg-brand"
      }`}
    >
      {sending && (
        <span className="progress-fill absolute inset-y-0 left-0 bg-white/25" aria-hidden />
      )}
      <span className="relative">
        {sending ? "Enviando…" : done ? doneLabel : idleLabel}
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
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
