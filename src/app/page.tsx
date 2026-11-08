import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaSection from "@/components/CtaSection";
import NetworkBackground from "@/components/NetworkBackground";
import { FeaturesShowcase, BenefitsGrid } from "@/components/Showcase";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-border">
        <NetworkBackground />
        <div className="glow" />
        <div className="relative mx-auto max-w-6xl px-4 py-28 text-center sm:py-36">
          <div className="mx-auto flex max-w-fit flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />
              Plataforma para Google Meu Negócio
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Mais alcance, mais clientes
            </span>
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Domine o seu{" "}
            <span className="text-brand-2">Google Meu Negócio</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Otimize fotos, agende postagens, acompanhe o desempenho e conquiste
            mais clientes no Google — numa plataforma única, feita para quem leva
            o GMB a sério.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#ferramentas"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ver ferramentas
              <span className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <Link
              href="/recursos"
              className="rounded-xl border border-border bg-surface/70 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-surface-2"
            >
              Conhecer os recursos
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-20">
        <div id="ferramentas" className="mb-14 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo o que você precisa para crescer no Google
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Uma plataforma, todas as frentes do Google Meu Negócio — da otimização
            das fotos ao relatório de crescimento.
          </p>
        </div>

        <FeaturesShowcase />

        <div className="mt-24">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Por que o GMN PRO
          </h2>
          <p className="mx-auto mb-10 mt-3 max-w-2xl text-center text-muted">
            Feito para agências e empresas que querem mais clientes vindos do Google.
          </p>
          <BenefitsGrid />
        </div>

        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
