import type { Metadata } from "next";
import MarketingHeader from "@/components/MarketingHeader";
import SiteFooter from "@/components/SiteFooter";
import NetworkBackground from "@/components/NetworkBackground";
import PlanosCards from "@/components/PlanosCards";

export const metadata: Metadata = {
  title: "Planos — GMN PRO",
  description:
    "Teste o GMN PRO grátis por 7 dias. Planos para o dono do negócio (R$ 20/mês) e para agências (perfis ilimitados, Análise de Ranking e relatórios com a sua marca).",
};

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

      <main className="mx-auto max-w-6xl px-4 py-16">
        <PlanosCards />

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
