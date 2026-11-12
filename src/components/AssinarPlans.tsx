"use client";

import { useState } from "react";
import type { Tier, Cycle } from "@/lib/entitlements";

type Busy = string;

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  );
}

export default function AssinarPlans({
  trial = false,
  currentTier = "essencial",
}: {
  trial?: boolean;
  currentTier?: string;
}) {
  const [cycle, setCycle] = useState<Cycle>("mensal");
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");

  async function checkout(tier: Tier) {
    setBusy(`pay:${tier}`);
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

  async function activateTrial(tier: Tier) {
    setBusy(`trial:${tier}`);
    setError("");
    try {
      const res = await fetch("/api/plan/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao ativar o plano.");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao ativar o plano.");
      setBusy("");
    }
  }

  const ag2 = cycle === "mensal" ? "R$ 97" : "R$ 1.091";
  const ag4 = cycle === "mensal" ? "R$ 130" : "R$ 1.463";
  const ess = cycle === "mensal" ? "R$ 20" : "R$ 225";
  const suffix = cycle === "mensal" ? "/mês" : "/ano";

  // Quem já está em um plano de agência não vê o plano de dono de negócio.
  const agencyOnly = currentTier.startsWith("agencia");

  // Botão de cada plano: no teste, "Usar no teste" (sem cartão); senão, "Assinar".
  function PlanButton({ tier, primary }: { tier: Tier; primary?: boolean }) {
    const isCurrent = currentTier === tier;
    const base = "mt-6 w-full rounded-xl px-6 py-3 text-sm font-semibold transition disabled:opacity-60";
    const solid = "bg-brand text-white hover:opacity-90";
    const outline = "border border-brand text-brand-2 hover:bg-brand/10";

    if (trial) {
      if (isCurrent) {
        return (
          <div className={`${base} cursor-default border border-brand bg-brand/10 text-center text-brand-2`}>
            ✓ Ativo no seu teste
          </div>
        );
      }
      return (
        <button
          onClick={() => activateTrial(tier)}
          disabled={busy !== ""}
          className={`${base} ${primary ? solid : outline}`}
        >
          {busy === `trial:${tier}` ? "Ativando…" : "Usar no teste"}
        </button>
      );
    }

    return (
      <button
        onClick={() => checkout(tier)}
        disabled={busy !== ""}
        className={`${base} ${primary ? solid : outline}`}
      >
        {busy === `pay:${tier}` ? "Abrindo…" : "Assinar"}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {trial && (
        <p className="rounded-2xl border border-brand/30 bg-brand/5 p-3 text-center text-sm text-brand-2">
          Você está no <strong>teste grátis</strong>. Escolha um plano para <strong>liberar e experimentar
          os recursos agora, sem cartão</strong>. A cobrança só começa quando você assinar.
        </p>
      )}

      {/* Alternador de ciclo */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-white p-0.5 card-soft">
          {(["mensal", "anual"] as Cycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${cycle === c ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}
            >
              {c === "mensal" ? "Mensal" : "Anual (−6%)"}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid items-stretch gap-5 ${agencyOnly ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {/* Essencial — oculto para quem já é agência */}
        {!agencyOnly && (
        <div className="flex flex-col rounded-3xl border border-border bg-white p-7 card-soft">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">🏪 Dono do negócio</span>
          <h3 className="mt-3 font-display text-lg font-semibold">Essencial</h3>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-display text-4xl font-extrabold">{ess}</span>
            <span className="mb-1 text-muted">{suffix}</span>
          </div>
          <p className="mt-1 text-sm text-muted">Pra quem cuida do próprio Google.</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {["Até 3 perfis", "Agendar e publicar posts", "Responder avaliações com IA", "Otimizar e geotaggear fotos", "Desempenho, Checklist e Auditoria", "Suporte no WhatsApp"].map((f) => (
              <li key={f} className="flex gap-2"><Check />{f}</li>
            ))}
          </ul>
          <PlanButton tier="essencial" />
        </div>
        )}

        {/* Agência 2 */}
        <div className="flex flex-col rounded-3xl border border-brand/30 bg-brand/5 p-7 card-soft">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-2">🏢 Agências e gestores</span>
          <h3 className="mt-3 font-display text-lg font-semibold">Agência 2</h3>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-display text-4xl font-extrabold">{ag2}</span>
            <span className="mb-1 text-muted">{suffix}</span>
          </div>
          <p className="mt-1 text-sm text-muted">Até 2 usuários · extra R$ 48,50</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {["Tudo do Essencial", "Perfis ilimitados", "Até 2 usuários", "Gestão de Locais", "Análise de Ranking (500 créditos/mês)", "Relatório PDF com sua marca", "Link e e-mail do relatório para o cliente"].map((f) => (
              <li key={f} className="flex gap-2"><Check />{f}</li>
            ))}
          </ul>
          <PlanButton tier="agencia2" />
        </div>

        {/* Agência 4 */}
        <div className="relative flex flex-col rounded-3xl border border-brand/50 bg-white p-7 shadow-2xl ring-1 ring-brand/30">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Mais popular</div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-2">🏢 Agências e gestores</span>
          <h3 className="mt-3 font-display text-lg font-semibold">Agência 4</h3>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-display text-4xl font-extrabold">{ag4}</span>
            <span className="mb-1 text-muted">{suffix}</span>
          </div>
          <p className="mt-1 text-sm text-muted">Até 4 usuários · extra R$ 48,50</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {["Tudo do Essencial", "Perfis ilimitados", "Até 4 usuários", "Mesmo valor por usuário extra", "Gestão de Locais", "Análise de Ranking (500 créditos/mês)", "Relatório PDF com sua marca"].map((f) => (
              <li key={f} className="flex gap-2"><Check />{f}</li>
            ))}
          </ul>
          <PlanButton tier="agencia4" primary />
        </div>
      </div>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <p className="text-center text-xs text-muted">
        Pagamento seguro via Stripe. Seus 7 dias grátis são respeitados — a cobrança só começa
        depois do teste.
      </p>
    </div>
  );
}
