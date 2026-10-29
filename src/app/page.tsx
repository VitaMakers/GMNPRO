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
      <main className="mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            Ferramentas gratuitas
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Ferramentas para o seu{" "}
            <span className="text-brand">Google Meu Negócio</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Prepare suas fotos, analise como sua empresa aparece no Google Maps
            e, em breve, agende suas postagens — tudo em um só lugar.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group flex flex-col rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/50 hover:bg-surface-2"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.tagClass}`}
                >
                  {t.tag}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{t.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{t.desc}</p>
              <span className="mt-4 text-sm font-medium text-brand opacity-0 transition group-hover:opacity-100">
                Abrir ferramenta →
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
