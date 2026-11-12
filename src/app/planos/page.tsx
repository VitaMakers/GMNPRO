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
        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {/* Essencial — dono do negócio */}
          <div className="flex flex-col rounded-3xl border border-border bg-white p-7 card-soft">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">🏪 Dono do negócio</span>
            <h3 className="mt-3 font-display text-lg font-semibold">Essencial</h3>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">R$ 20</span>
              <span className="mb-1 text-muted">/mês</span>
            </div>
            <p className="mt-1 text-sm text-muted">ou R$ 225/ano (−6%)</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {["Até 3 perfis", "Agendar e publicar posts", "Responder avaliações com IA", "Otimizar e geotaggear fotos", "Desempenho, Checklist e Auditoria", "Suporte no WhatsApp"].map((f) => (
                <li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-brand-2">✓</span><span>{f}</span></li>
              ))}
            </ul>
            <Link href="/entrar?signup=1" className="mt-6 block rounded-xl border border-brand px-6 py-3 text-center text-sm font-semibold text-brand-2 transition hover:bg-brand/10">
              Começar teste grátis
            </Link>
          </div>

          {/* Agência 2 */}
          <div className="flex flex-col rounded-3xl border border-brand/30 bg-brand/5 p-7 card-soft">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-2">🏢 Agências e gestores</span>
            <h3 className="mt-3 font-display text-lg font-semibold">Agência 2</h3>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">R$ 97</span>
              <span className="mb-1 text-muted">/mês</span>
            </div>
            <p className="mt-1 text-sm text-muted">Até 2 usuários · extra R$ 48,50</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {["Tudo do Essencial", "Perfis ilimitados", "Até 2 usuários", "Análise de Ranking (500 créditos/mês)*", "Relatório PDF com sua marca"].map((f) => (
                <li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-brand-2">✓</span><span>{f}</span></li>
              ))}
            </ul>
            <Link href="/entrar?signup=1" className="mt-6 block rounded-xl border border-brand px-6 py-3 text-center text-sm font-semibold text-brand-2 transition hover:bg-brand/10">
              Começar teste grátis
            </Link>
          </div>

          {/* Agência 4 (destaque) */}
          <div className="relative flex flex-col rounded-3xl border border-brand/50 bg-white p-7 shadow-2xl ring-1 ring-brand/30">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Mais popular</div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-2">🏢 Agências e gestores</span>
            <h3 className="mt-3 font-display text-lg font-semibold">Agência 4</h3>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold">R$ 130</span>
              <span className="mb-1 text-muted">/mês</span>
            </div>
            <p className="mt-1 text-sm text-muted">Até 4 usuários · extra R$ 48,50</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {["Tudo da Agência 2", "Até 4 usuários", "Mesmo valor por usuário extra", "Análise de Ranking (500 créditos/mês)*"].map((f) => (
                <li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-brand-2">✓</span><span>{f}</span></li>
              ))}
            </ul>
            <Link href="/entrar?signup=1" className="mt-6 block rounded-xl bg-brand px-6 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90">
              Começar teste grátis
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Todos os planos começam com <span className="text-foreground">7 dias grátis</span> — sem
          fidelidade, cancele quando quiser.
        </p>
        <p className="mt-2 text-center text-xs text-muted">
          * Os créditos da Análise de Ranking são liberados quando o pagamento começa (depois dos 7
          dias de teste) — durante o teste grátis não há créditos.
        </p>

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
