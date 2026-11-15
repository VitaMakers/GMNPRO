"use client";

import { useState } from "react";

export default function AdminAffiliateButton({ userId, email }: { userId: string; email?: string }) {
  const [busy, setBusy] = useState(false);

  async function gen() {
    if (!confirm("Tornar esta conta um afiliado e gerar o link de indicação?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert("Erro: " + (d.error ?? res.status));
        return;
      }
      const base = window.location.origin;
      const link = `${base}/r/${d.code}`;
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        /* ignore */
      }
      prompt(d.existed ? "Já era afiliado. Link (copiado):" : "Afiliado criado! Link (copiado):", link);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={gen}
      disabled={busy}
      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-60"
    >
      {busy ? "…" : "Afiliado"}
    </button>
  );
}
