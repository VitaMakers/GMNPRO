"use client";

import { useEffect, useState } from "react";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";

type LocationOption = { location_name: string; title: string | null };

export default function DescriptionTool({ locations }: { locations: LocationOption[] }) {
  const active = useActiveProfile();
  const selected = active ?? locations[0]?.location_name ?? "";
  const selectedTitle = locations.find((l) => l.location_name === selected)?.title ?? "perfil";

  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"" | "new" | "improve" | "save">("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (locations[0]) initActiveProfile(locations[0].location_name);
  }, [locations]);

  // Ao trocar de perfil, limpa a área.
  useEffect(() => {
    setText("");
    setMsg(null);
  }, [selected]);

  async function generate(mode: "new" | "improve") {
    if (!selected) return;
    setBusy(mode);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selected, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setText(data.description ?? "");
    } catch (e) {
      setMsg({ type: "err", text: `Não foi possível gerar: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    if (!selected || !text.trim()) return;
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch("/api/google/update-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selected, description: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setMsg({ type: "ok", text: "Descrição publicada no seu perfil do Google! Pode levar alguns minutos para aparecer." });
    } catch (e) {
      setMsg({ type: "err", text: `Não foi possível publicar: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-white p-6 card-soft">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Descrição do perfil com IA</h2>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-medium text-brand-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {selectedTitle}
        </span>
      </div>
      <p className="mb-4 text-sm text-muted">
        Gere uma descrição nova ou melhore a atual — a IA escreve no padrão do Google, você revisa e
        publica direto no perfil.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => generate("new")}
          disabled={busy !== ""}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy === "new" ? "Gerando…" : "Sugerir nova"}
        </button>
        <button
          onClick={() => generate("improve")}
          disabled={busy !== ""}
          className="rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand-2 transition hover:bg-brand/10 disabled:opacity-60"
        >
          {busy === "improve" ? "Melhorando…" : "Melhorar a atual"}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 750))}
        rows={6}
        placeholder="A descrição gerada aparece aqui. Você pode editar antes de publicar."
        className="mt-4 w-full rounded-2xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>{text.length}/750</span>
        {text.trim() && (
          <button
            onClick={publish}
            disabled={busy !== ""}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy === "save" ? "Publicando…" : "Salvar e publicar no Google"}
          </button>
        )}
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.type === "ok" ? "text-brand-2" : "text-red-500"}`}>{msg.text}</p>
      )}
    </div>
  );
}
