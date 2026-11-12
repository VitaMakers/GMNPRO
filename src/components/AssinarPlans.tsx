"use client";

import { useState } from "react";
import type { Tier, Cycle } from "@/lib/entitlements";

type Busy = `${Tier}:${Cycle}` | "";

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  );
}

export default function AssinarPlans() {
  const [cycle, setCycle] = useState<Cycle>("mensal");
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");

  async function go(tier: Tier) {
    setBusy(`${tier}:${cycle}`);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Falha ao iniciar o pagamento.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar o pagamento.");
      setBusy("");
    }
  }

  const essencialPrice = cycle === "mensal" ? "R$ 20" : "R$ 225";
  const essencialSuffix = cycle === "mensal" ? "/mês" : "/ano";
  const ag2 = cycle === "mensal" ? "R$ 97" : "R$ 1.091";
  const ag4 = cycle === "mensal" ? "R$ 130" : "R$ 1.463";

  return (
    <div className="space-y-10">
      {/* Alternador de ciclo */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
          {(["mensal", "anual"] as Cycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${cycle === c ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}
            >
              {c === "mensal" ? "Mensal" : "Anual (−6%)"}
            </button>
          ))}
        </div>
      </div>

      {/* BLOCO 1 — Dono de negócio local */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">🏪</span>
          <h2 className="font-display text-xl font-bold tracking-tight">Para o dono do negócio</h2>
        </div>
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-7 card-soft">
          <h3 className="font-display text-lg font-semibold">Essencial</h3>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-4xl font-extrabold">{essencialPrice}</span>
            <span className="mb-1 text-muted">{essencialSuffix}</span>
          </div>
          <p className="mt-2 text-sm text-muted">Pra quem cuida do próprio Google.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {["Até 3 perfis", "Agendar e publicar posts", "Responder avaliações com IA", "Otimizar e geotaggear fotos", "Desempenho, Checklist e Auditoria", "Suporte no WhatsApp"].map((f) => (
              <li key={f} className="flex gap-2"><Check />{f}</li>
            ))}
          </ul>
          <button
            onClick={() => go("essencial")}
            disabled={busy !== ""}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy === `essencial:${cycle}` ? "Abrindo…" : "Assinar Essencial"}
          </button>
        </div>
      </section>

      {/* BLOCO 2 — Agências e gestores */}
      <section className="rounded-[2rem] border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">🏢</span>
          <h2 className="font-display text-xl font-bold tracking-tight">Para agências e gestores</h2>
        </div>
        <p className="mb-5 text-sm text-muted">
          Gerencie perfis ilimitados de vários clientes, com Análise de Ranking (geo-grid) e
          relatórios com a sua marca.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Agência 2 */}
          <div className="rounded-3xl border border-border bg-white p-7 card-soft">
            <h3 className="font-display text-lg font-semibold">Agência 2</h3>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">{ag2}</span>
              <span className="mb-1 text-muted">{essencialSuffix}</span>
            </div>
            <p className="mt-2 text-sm text-muted">Até 2 usuários · usuário extra R$ 48,50</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Tudo do Essencial", "Perfis ilimitados", "Até 2 usuários", "Análise de Ranking (500 créditos/mês)", "Relatório PDF com sua marca"].map((f) => (
                <li key={f} className="flex gap-2"><Check />{f}</li>
              ))}
            </ul>
            <button
              onClick={() => go("agencia2")}
              disabled={busy !== ""}
              className="mt-6 w-full rounded-xl border border-brand px-6 py-3 text-sm font-semibold text-brand-2 transition hover:bg-brand/10 disabled:opacity-60"
            >
              {busy === `agencia2:${cycle}` ? "Abrindo…" : "Assinar Agência 2"}
            </button>
          </div>

          {/* Agência 4 (destaque) */}
          <div className="relative rounded-3xl border border-brand/50 bg-white p-7 shadow-2xl ring-1 ring-brand/30">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
              Mais popular
            </div>
            <h3 className="font-display text-lg font-semibold">Agência 4</h3>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">{ag4}</span>
              <span className="mb-1 text-muted">{essencialSuffix}</span>
            </div>
            <p className="mt-2 text-sm text-muted">Até 4 usuários · usuário extra R$ 48,50</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Tudo do Essencial", "Perfis ilimitados", "Até 4 usuários", "Mesmo valor por usuário extra", "Análise de Ranking (500 créditos/mês)"].map((f) => (
                <li key={f} className="flex gap-2"><Check />{f}</li>
              ))}
            </ul>
            <button
              onClick={() => go("agencia4")}
              disabled={busy !== ""}
              className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy === `agencia4:${cycle}` ? "Abrindo…" : "Assinar Agência 4"}
            </button>
          </div>
        </div>
      </section>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <p className="text-center text-xs text-muted">
        Pagamento seguro via Stripe. Seus 7 dias grátis são respeitados — a cobrança só começa
        depois do teste.
      </p>
    </div>
  );
}
