import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaSection from "@/components/CtaSection";
import { BenefitsGrid } from "@/components/Showcase";
import HeroCommand from "@/components/landing/HeroCommand";
import { TrustBadges } from "@/components/GoogleBadge";
import SocialProof from "@/components/landing/SocialProof";
import MockProfiles from "@/components/landing/MockProfiles";
import MockReviewAI from "@/components/landing/MockReviewAI";
import MockPerformance from "@/components/landing/MockPerformance";

function Feature({
  eyebrow,
  title,
  desc,
  chips,
  reverse,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  chips?: string[];
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className={reverse ? "md:order-2" : ""}>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-2">{eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-md text-lg text-muted">{desc}</p>
          {chips && (
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <Link
            href="/entrar?signup=1"
            className="mt-7 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Começar teste grátis
          </Link>
        </div>
        <div className={reverse ? "md:order-1" : ""}>{children}</div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Hero */}
      <section className="px-4 pb-8 pt-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <TrustBadges className="mb-7" />
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Seu Google Meu Negócio
            <br />
            no automático.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            Agende posts, otimize fotos com IA, responda avaliações e acompanhe o desempenho do seu
            perfil — tudo num só lugar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/entrar?signup=1"
              className="rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Começar teste grátis
            </Link>
            <Link
              href="/recursos"
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:text-brand-2"
            >
              Ver o que faz <span>→</span>
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-5xl">
          <HeroCommand />
          <SocialProof />
        </div>
      </section>

      <Feature
        eyebrow="Clientes"
        title="Todos os seus clientes em um só lugar."
        desc="Conecte quantos perfis do Google quiser e gerencie todos na mesma conta — ideal para quem cuida de vários clientes."
        chips={["Vários clientes", "Uma conta", "Zero bagunça"]}
        reverse
      >
        <MockProfiles />
      </Feature>

      <Feature
        eyebrow="Avaliações"
        title="Responda avaliações sem perder tempo."
        desc="A IA escreve respostas no seu tom, citando o nome da pessoa. Você só revisa e envia — ou deixa no automático."
        chips={["No seu tom", "Até as negativas", "Automático opcional"]}
      >
        <MockReviewAI />
      </Feature>

      <Feature
        eyebrow="Desempenho"
        title="Acompanhe seu crescimento de perto."
        desc="Visualizações, contatos, rotas e avaliações — com comparação de evolução por período, do jeito que o Google mostra."
        chips={["Visualizações", "Contatos e rotas", "Avaliações"]}
        reverse
      >
        <MockPerformance />
      </Feature>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Tudo o que você precisa, num lugar só
        </h2>
        <p className="mx-auto mb-10 mt-3 max-w-2xl text-center text-muted">
          Uma plataforma para todas as frentes do Google Meu Negócio.
        </p>
        <BenefitsGrid />
        <CtaSection />
      </section>

      <SiteFooter />
    </div>
  );
}
