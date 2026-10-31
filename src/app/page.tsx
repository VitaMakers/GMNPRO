import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaSection from "@/components/CtaSection";

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
        <div className="grid-bg" />
        <div className="glow" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Plataforma para Google Meu Negócio
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Domine o seu
              <br />
              <span className="text-brand">Google Meu Negócio</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Otimize fotos, avalie seu perfil e agende postagens — numa
              plataforma única, rápida e feita para quem leva o GMB a sério.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#ferramentas"
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Ver ferramentas
              </a>
              <a
                href="/agendamento"
                className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold transition hover:bg-surface-2"
              >
                Agendar postagens
              </a>
            </div>
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
