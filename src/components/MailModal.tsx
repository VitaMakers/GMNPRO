"use client";

import { useState } from "react";

/** Modal de envio do relatório por e-mail (usado na Análise Completa e na Gestão de Locais). */
export default function MailModal({
  location,
  title,
  onClose,
  onSent,
  onError,
}: {
  location: string;
  title: string;
  onClose: () => void;
  onSent: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [monthly, setMonthly] = useState(true);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/report/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, to: to.trim(), note: note.trim(), monthly }),
      });
      const d = await res.json();
      if (!res.ok) { onError(d.detail ?? d.error ?? "Não foi possível enviar."); return; }
      onSent(`E-mail enviado para ${to.trim()}${monthly ? " — e todo mês automaticamente." : "."}`);
    } catch {
      onError("Falha de conexão ao enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold">Enviar relatório por e-mail</p>
        <p className="mt-0.5 text-xs text-muted">{title}</p>
        <label className="mt-4 block text-xs text-muted">E-mail do cliente
          <input value={to} onChange={(e) => setTo(e.target.value)} type="email" placeholder="cliente@empresa.com" className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
        </label>
        <label className="mt-3 block text-xs text-muted">Mensagem (opcional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Olá! Segue a análise do seu perfil no Google…" className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} className="h-4 w-4 accent-[#059669]" />
          Enviar automaticamente todo mês (com dados atualizados)
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={send} disabled={busy || !to.includes("@")} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Enviando…" : "Enviar"}</button>
        </div>
      </div>
    </div>
  );
}
