import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaSection from "@/components/CtaSection";
import NetworkBackground from "@/components/NetworkBackground";
import { FeaturesShowcase, BenefitsGrid } from "@/components/Showcase";

export const metadata: Metadata = {
  title: "Recursos — GMN PRO",
  description:
    "Tudo o que o GMN PRO faz pelo seu Google Meu Negócio: otimização de fotos, agendamento, desempenho, avaliações e mais.",
};

const STEPS = [
  { n: 1, title: "Conecte o Google", desc: "Entre com a conta Google e autorize. Seus perfis aparecem automaticamente." },
  { n: 2, title: "Otimize e publique", desc: "Prepare fotos, agende postagens e mantenha o perfil ativo toda semana." },
  { n: 3, title: "Acompanhe e cresça", desc: "Veja o desempenho, as oportunidades e peça avaliações para crescer." },
];

export default function RecursosPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <NetworkBackground />
        <div className="glow" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />
            Recursos do GMN PRO
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
            Uma solução completa para o seu Google
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Do preparo das fotos ao relatório de crescimento — tudo o que a sua
            empresa (ou os perfis dos seus clientes) precisa para alcançar mais
            pessoas no Google Meu Negócio.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-20">
        {/* Como funciona */}
        <div className="mb-24 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface p-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>

        <FeaturesShowcase />

        <div className="mt-24">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Benefícios para o seu negócio
          </h2>
          <p className="mx-auto mb-10 mt-3 max-w-2xl text-center text-muted">
            Mais alcance, mais avaliações, mais clientes — com menos trabalho manual.
          </p>
          <BenefitsGrid />
        </div>

        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
