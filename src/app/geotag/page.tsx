import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import GeotagTool from "@/components/GeotagTool";
import CtaSection from "@/components/CtaSection";
import Faq from "@/components/Faq";

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
          <h1 className="text-3xl font-bold tracking-tight">
            Prepare suas fotos para o Google Meu Negócio
          </h1>
          <p className="mt-2 text-muted">
            Otimize suas fotos nas specs ideais do Google, com título, descrição,
            palavras-chave e localização — prontas para subir no perfil.{" "}
            <span className="text-foreground">
              Tudo no seu navegador: as imagens nunca saem do seu dispositivo.
            </span>
          </p>
        </div>
        <GeotagTool />

        <section className="mt-12 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold">O que realmente melhora sua foto no GMB</h2>
          <p className="mt-2 text-sm text-muted">
            Sejamos transparentes: o Google remove boa parte dos metadados (como o
            GPS) ao subir a foto. O que de fato ajuda — e esta ferramenta entrega —
            é preparar a imagem para performar:
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {realBenefits.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-2">✓</span>
                <span className="text-muted">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold">Guia de boa foto</h2>
          <p className="mt-2 text-sm text-muted">
            A foto que mais ajuda é a que o Google e o cliente entendem bem:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {photoTips.map((t) => (
              <div key={t.title} className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="mt-1 text-xs text-muted">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

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

        <Faq items={faq} />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}

const faq = [
  {
    q: "O que é geotag em foto?",
    a: "Geotag é a inclusão de coordenadas geográficas (latitude e longitude) nos metadados EXIF de uma foto. Aqui, além do GPS, otimizamos a imagem e gravamos título, descrição e palavras-chave.",
  },
  {
    q: "Esta ferramenta envia minha foto para algum servidor?",
    a: "Não. Todo o processamento acontece no seu navegador. Sua foto nunca é enviada para nenhum servidor — os arquivos são gerados no seu próprio dispositivo.",
  },
  {
    q: "O Google usa o GPS gravado na foto?",
    a: "Sejamos transparentes: o Google remove boa parte dos metadados ao subir a foto no perfil. O que realmente ajuda — e esta ferramenta entrega — é a otimização da imagem, a qualidade e o nome de arquivo descritivo.",
  },
  {
    q: "Posso processar várias fotos de uma vez?",
    a: "Sim. A ferramenta processa em lote: suba várias fotos, ajuste os metadados e baixe todas em um único arquivo ZIP.",
  },
];

const realBenefits = [
  "Resolução e proporção ajustadas às specs recomendadas pelo Google (foto exibida melhor, sem recorte feio).",
  "JPEG de alta qualidade e tamanho otimizado — carrega rápido e o Google reprocessa menos.",
  "Brilho, contraste e nitidez leves: foto mais atraente gera mais cliques, e engajamento é sinal de ranqueamento.",
  "Nome de arquivo descritivo (ex.: buffet-para-casamentos-em-sorocaba.jpg), que o Google lê e indexa.",
  "Título, descrição e palavras-chave organizados para você reaproveitar na legenda ao postar.",
];

const photoTips = [
  { title: "Mostre a fachada com a placa", desc: "Ajuda o Google a confirmar o local e o cliente a reconhecer a empresa." },
  { title: "Boa iluminação", desc: "Prefira luz natural; evite fotos escuras ou estouradas." },
  { title: "Foco no que importa", desc: "Produto, ambiente ou equipe nítidos e centralizados." },
  { title: "Fotos novas com frequência", desc: "Perfis que recebem fotos novas regularmente performam melhor." },
  { title: "Horizontal quando possível", desc: "A maioria dos espaços do GMB favorece fotos em paisagem." },
  { title: "Evite marcas d'água pesadas", desc: "O Google pode penalizar; prefira a imagem limpa." },
];

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
