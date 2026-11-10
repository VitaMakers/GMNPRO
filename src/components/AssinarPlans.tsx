"use client";

import { useState } from "react";

export default function AssinarPlans() {
  const [loading, setLoading] = useState<"" | "mensal" | "anual">("");
  const [error, setError] = useState("");

  async function go(plan: "mensal" | "anual") {
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Falha ao iniciar o pagamento.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar o pagamento.");
      setLoading("");
    }
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-7">
          <h2 className="font-display text-lg font-semibold">Mensal</h2>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-4xl font-extrabold">R$ 20</span>
            <span className="mb-1 text-muted">/mês</span>
          </div>
          <p className="mt-2 text-sm text-muted">Flexível, cancele quando quiser.</p>
          <button
            onClick={() => go("mensal")}
            disabled={loading !== ""}
            className="mt-6 w-full rounded-xl border border-brand px-6 py-3 text-sm font-semibold text-brand-2 transition hover:bg-brand/10 disabled:opacity-60"
          >
            {loading === "mensal" ? "Abrindo…" : "Assinar mensal"}
          </button>
        </div>

        <div className="relative rounded-3xl border border-brand/50 bg-surface p-7 shadow-2xl ring-1 ring-brand/30">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            Economize 6%
          </div>
          <h2 className="font-display text-lg font-semibold">Anual</h2>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-4xl font-extrabold">R$ 225</span>
            <span className="mb-1 text-muted">/ano</span>
          </div>
          <p className="mt-2 text-sm text-muted">Equivale a R$ 18,75/mês · economize R$ 15.</p>
          <button
            onClick={() => go("anual")}
            disabled={loading !== ""}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading === "anual" ? "Abrindo…" : "Assinar anual"}
          </button>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <p className="mt-4 text-center text-xs text-muted">
        Pagamento seguro via Stripe. Seus 7 dias grátis são respeitados — a cobrança só começa
        depois do teste.
      </p>
    </div>
  );
}
