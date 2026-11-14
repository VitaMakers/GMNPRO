"use client";

import { useState } from "react";

export default function AdminFoundingButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function gen() {
    const valor = prompt("Valor mensal do desconto exclusivo (R$):", "80");
    if (!valor) return;
    const tier = prompt("Plano (agencia2 ou agencia4):", "agencia2") as string;
    if (!tier) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/founding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: Number(valor.replace(",", ".")), tier }),
      });
      const d = await res.json();
      if (!res.ok) { alert("Erro: " + (d.error ?? res.status)); return; }
      try { await navigator.clipboard.writeText(d.url); } catch { /* ignore */ }
      prompt("Link de cobrança (copiado). Envie ao cliente:", d.url);
    } finally { setBusy(false); }
  }

  return (
    <button onClick={gen} disabled={busy} className="rounded-lg border border-brand/40 px-2.5 py-1 text-xs font-medium text-brand-2 transition hover:bg-brand/10 disabled:opacity-60">
      {busy ? "…" : "Desconto exclusivo"}
    </button>
  );
}
