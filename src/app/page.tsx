import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaSection from "@/components/CtaSection";
import NetworkBackground from "@/components/NetworkBackground";
import GmbPhoneMockup from "@/components/GmbPhoneMockup";

const tools = [
  {
    href: "/geotag",
    title: "Geotag de Fotos",
    desc: "Adicione localização, título e palavras-chave nas fotos do seu GMB em segundos. Suas imagens nunca saem do navegador.",
    tag: "Pronto",
    tagClass: "bg-brand-2/15 text-brand-2",
  },
  {
    href: "/checklist",
    title: "Checklist GMB",
    desc: "Auto-avaliação gratuita: marque o que já faz no seu perfil e receba uma nota com as prioridades do que melhorar.",
    tag: "Pronto",
    tagClass: "bg-brand-2/15 text-brand-2",
  },
  {
    href: "/auditoria",
    title: "Auditoria do Perfil",
    desc: "Analise como sua empresa aparece no Google Maps e veja o que melhorar na ficha, com nota e lista de prioridades.",
    tag: "Em breve",
    tagClass: "bg-accent/15 text-accent",
  },
  {
    href: "/agendamento",
    title: "Agendamento de Postagens",
    desc: "Monte postagens com foto e botão de ação, programe a data e deixe a publicação automática no seu perfil (conexão com o Google em liberação).",
    tag: "Beta",
    tagClass: "bg-brand/15 text-brand",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-border">
        <NetworkBackground />
        <div className="glow" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:py-28 lg:grid-cols-2">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />
                Plataforma para Google Meu Negócio
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Mais alcance, mais clientes
              </span>
            </div>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Domine o seu
              <br />
              <span className="text-brand-2">Google Meu Negócio</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Otimize fotos, agende postagens, acompanhe o desempenho e cresça no
              Google — numa plataforma única, feita para quem leva o GMB a sério.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#ferramentas"
                className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Ver ferramentas
                <span className="transition group-hover:translate-x-0.5">→</span>
              </a>
              <Link
                href="/entrar"
                className="rounded-xl border border-border bg-surface/70 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-surface-2"
              >
                Entrar / Criar conta
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <GmbPhoneMockup />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div id="ferramentas" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface-2"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full opacity-0 blur-2xl transition group-hover:opacity-100"
                style={{ background: "color-mix(in oklab, var(--brand) 40%, transparent)" }}
              />
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.tagClass}`}
                >
                  {t.tag}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{t.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t.desc}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-2 transition group-hover:gap-2">
                Abrir ferramenta <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>

        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
