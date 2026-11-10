import type { Metadata } from "next";
import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import SiteFooter from "@/components/SiteFooter";
import NetworkBackground from "@/components/NetworkBackground";

export const metadata: Metadata = {
  title: "Planos — GMN PRO",
  description:
    "Teste o GMN PRO grátis por 7 dias. Depois, apenas R$ 20 por mês para gerenciar e crescer o seu Google Meu Negócio.",
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
            Um plano, tudo incluído
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Teste <span className="text-foreground">7 dias grátis</span>. Depois, só{" "}
            <span className="text-foreground">R$ 20 por mês</span> — sem fidelidade, cancele quando
            quiser.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-md px-4 py-16">
        <div className="relative rounded-3xl border border-brand/40 bg-surface p-7 shadow-2xl">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            7 dias grátis
          </div>

          <h2 className="font-display text-xl font-semibold">GMN PRO</h2>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-5xl font-extrabold">R$ 20</span>
            <span className="mb-1.5 text-muted">/mês</span>
          </div>
          <p className="mt-2 text-sm text-muted">Comece grátis por 7 dias. Cobrança só depois.</p>

          <ul className="mt-6 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-brand-2">✓</span>
                <span className="text-muted">{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/entrar?signup=1"
            className="mt-7 block rounded-xl bg-brand px-6 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
          >
            Começar teste grátis
          </Link>
          <p className="mt-3 text-center text-xs text-muted">
            Sem compromisso. Você só paga se continuar depois dos 7 dias.
          </p>
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
