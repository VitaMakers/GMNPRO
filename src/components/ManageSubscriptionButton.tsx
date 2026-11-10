"use client";

import { useState } from "react";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(
          data.error === "sem_assinatura"
            ? "Você ainda não tem uma assinatura para gerenciar."
            : (data.error ?? "Não foi possível abrir o portal."),
        );
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao abrir o portal.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 text-center">
      <button
        onClick={go}
        disabled={loading}
        className="text-sm text-brand-2 transition hover:underline disabled:opacity-60"
      >
        {loading ? "Abrindo…" : "Gerenciar assinatura (trocar cartão, faturas, cancelar)"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
