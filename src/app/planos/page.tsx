import type { Metadata } from "next";
import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import SiteFooter from "@/components/SiteFooter";
import NetworkBackground from "@/components/NetworkBackground";

export const metadata: Metadata = {
  title: "Planos — GMN PRO",
  description:
    "Teste o GMN PRO grátis por 7 dias. Depois, R$ 20/mês ou R$ 225/ano (6% de desconto) para gerenciar e crescer o seu Google Meu Negócio.",
};

const FEATURES = [
  "Agendamento de posts e fotos com publicação automática",
  "Geotag de fotos com IA (título, descrição e palavras-chave fortes)",
  "Respostas de avaliações com IA (manual ou automática)",
  "Desempenho do perfil: visualizações, ações e avaliações",
  "Checklist automático do perfil (nota e o que falta)",
  "Auditoria de qualquer empresa pelo Google Maps",
  "Múltiplos perfis na mesma conta",
];

export default function PlanosPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-border">
        <NetworkBackground />
        <div className="glow" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />
            Simples e barato
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
            Escolha seu plano
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Comece com <span className="text-foreground">7 dias grátis</span>. Depois, mensal ou
            anual — sem fidelidade, cancele quando quiser.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Mensal */}
          <div className="rounded-3xl border border-border bg-surface p-7">
            <h2 className="font-display text-lg font-semibold">Mensal</h2>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">R$ 20</span>
              <span className="mb-1 text-muted">/mês</span>
            </div>
            <p className="mt-2 text-sm text-muted">Flexível, cancele quando quiser.</p>
            <Link
              href="/entrar?signup=1"
              className="mt-6 block rounded-xl border border-brand px-6 py-3 text-center text-sm font-semibold text-brand-2 transition hover:bg-brand/10"
            >
              Começar teste grátis
            </Link>
          </div>

          {/* Anual (destaque) */}
          <div className="relative rounded-3xl border border-brand/50 bg-surface p-7 shadow-2xl ring-1 ring-brand/30">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
              Economize 6%
            </div>
            <h2 className="font-display text-lg font-semibold">Anual</h2>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">R$ 225</span>
              <span className="mb-1 text-muted">/ano</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Equivale a <span className="text-foreground">R$ 18,75/mês</span> · você economiza R$ 15
              por ano.
            </p>
            <Link
              href="/entrar?signup=1"
              className="mt-6 block rounded-xl bg-brand px-6 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
            >
              Começar teste grátis
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          Os dois planos começam com <span className="text-foreground">7 dias grátis</span>. Você só
          paga depois do teste — e pode cancelar quando quiser.
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-semibold">Tudo incluído nos dois planos</h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-brand-2">✓</span>
                <span className="text-muted">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-8 max-w-sm text-center text-xs text-muted">
          Dúvidas? Fale com a gente:{" "}
          <a href="mailto:contato@vitamakers.com.br" className="text-brand-2 hover:underline">
            contato@vitamakers.com.br
          </a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
