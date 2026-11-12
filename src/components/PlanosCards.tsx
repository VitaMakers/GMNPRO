"use client";

import { useState } from "react";
import Link from "next/link";

type Cycle = "mensal" | "anual";

interface PlanCard {
  tag: string;
  tagAgency: boolean;
  name: string;
  mensal: string;
  anual: string;
  anualEquiv: string;
  features: string[];
  highlight?: boolean;
  tint?: boolean;
}

const PLANS: PlanCard[] = [
  {
    tag: "🏪 Dono do negócio",
    tagAgency: false,
    name: "Essencial",
    mensal: "R$ 20",
    anual: "R$ 225",
    anualEquiv: "R$ 18,75/mês",
    features: [
      "Até 3 perfis",
      "Agendar e publicar posts",
      "Responder avaliações com IA",
      "Otimizar e geotaggear fotos",
      "Desempenho, Checklist e Auditoria",
      "Suporte no WhatsApp",
    ],
  },
  {
    tag: "🏢 Agências e gestores",
    tagAgency: true,
    name: "Agência 2",
    mensal: "R$ 97",
    anual: "R$ 1.091",
    anualEquiv: "R$ 90,92/mês",
    tint: true,
    features: [
      "Tudo do Essencial",
      "Perfis ilimitados",
      "Até 2 usuários",
      "Gestão de Locais (todos os clientes num painel)",
      "Análise de Ranking (500 créditos/mês)*",
      "Relatório PDF com sua marca",
      "Link e e-mail do relatório para o cliente",
      "Atualização automática noturna",
    ],
  },
  {
    tag: "🏢 Agências e gestores",
    tagAgency: true,
    name: "Agência 4",
    mensal: "R$ 130",
    anual: "R$ 1.463",
    anualEquiv: "R$ 121,92/mês",
    highlight: true,
    features: [
      "Tudo da Agência 2",
      "Até 4 usuários",
      "Mesmo valor por usuário extra",
      "Gestão de Locais (todos os clientes num painel)",
      "Análise de Ranking (500 créditos/mês)*",
      "Relatório PDF com sua marca",
    ],
  },
];

export default function PlanosCards() {
  const [cycle, setCycle] = useState<Cycle>("mensal");

  return (
    <div>
      {/* Alternador */}
      <div className="mb-8 flex justify-center">
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

      <div className="grid items-stretch gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-3xl p-7 ${
              p.highlight
                ? "border border-brand/50 bg-white shadow-2xl ring-1 ring-brand/30"
                : p.tint
                  ? "border border-brand/30 bg-brand/5 card-soft"
                  : "border border-border bg-white card-soft"
            }`}
          >
            {p.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                Mais popular
              </div>
            )}
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.tagAgency ? "bg-brand/10 text-brand-2" : "bg-surface-2 text-muted"}`}
            >
              {p.tag}
            </span>
            <h3 className="mt-3 font-display text-lg font-semibold">{p.name}</h3>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">{cycle === "mensal" ? p.mensal : p.anual}</span>
              <span className="mb-1 text-muted">{cycle === "mensal" ? "/mês" : "/ano"}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {cycle === "mensal" ? "cobrado mensalmente" : `equivale a ${p.anualEquiv}`}
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-2">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/entrar?signup=1"
              className={`mt-6 block rounded-xl px-6 py-3 text-center text-sm font-semibold transition ${
                p.highlight
                  ? "bg-brand text-white hover:opacity-90"
                  : "border border-brand text-brand-2 hover:bg-brand/10"
              }`}
            >
              Começar teste grátis
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Todos os planos começam com <span className="text-foreground">7 dias grátis</span> — sem
        fidelidade, cancele quando quiser.
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        * Os créditos da Análise de Ranking são liberados quando o pagamento começa (depois dos 7
        dias de teste) — durante o teste grátis não há créditos.
      </p>
    </div>
  );
}
