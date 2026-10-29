import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GeotagTool from "@/components/GeotagTool";

export const metadata: Metadata = {
  title: "Geotag de Fotos — GMN PRO",
  description:
    "Adicione localização, título e palavras-chave nas fotos do seu Google Meu Negócio. As imagens nunca saem do seu navegador.",
};

export default function GeotagPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Geotag de Fotos</h1>
          <p className="mt-2 text-muted">
            Adicione localização, título e palavras-chave nas fotos do seu GMB em
            segundos.{" "}
            <span className="text-foreground">
              Suas imagens nunca saem do navegador.
            </span>
          </p>
        </div>
        <GeotagTool />

        <section className="mt-14">
          <h2 className="mb-6 text-xl font-bold">Como funciona</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-2/15 text-brand-2">
                    {s.icon}
                  </span>
                  <span className="text-2xl font-bold text-border">{s.n}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const steps = [
  {
    n: 1,
    icon: "📍",
    title: "Defina a cidade",
    desc: "Digite a cidade do seu negócio. A ferramenta busca as coordenadas automaticamente.",
  },
  {
    n: 2,
    icon: "⬆️",
    title: "Suba suas fotos",
    desc: "Arraste as fotos para a área indicada ou toque para selecionar. Aceita JPG, PNG e WEBP.",
  },
  {
    n: 3,
    icon: "🏷️",
    title: "Preencha os metadados",
    desc: "Para cada foto, defina título, descrição e palavras-chave. A ferramenta sugere automaticamente.",
  },
  {
    n: 4,
    icon: "⬇️",
    title: "Baixe o resultado",
    desc: "As fotos saem no mesmo enquadramento, sem corte, com geotag e EXIF prontas para o GMB.",
  },
];
