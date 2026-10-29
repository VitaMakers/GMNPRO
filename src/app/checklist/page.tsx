import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChecklistTool from "@/components/ChecklistTool";
import CtaSection from "@/components/CtaSection";
import Faq from "@/components/Faq";

export const metadata: Metadata = {
  title: "Checklist do Google Meu Negócio — GMN PRO",
  description:
    "Auto-avaliação gratuita do seu perfil do Google Meu Negócio: marque o que já faz e receba uma nota com as prioridades do que melhorar.",
};

const faq = [
  {
    q: "Preciso de login ou cadastro?",
    a: "Não. O checklist é 100% gratuito e funciona direto no navegador. Suas respostas ficam salvas só no seu dispositivo.",
  },
  {
    q: "Como a nota é calculada?",
    a: "Cada item tem um peso conforme o impacto no ranqueamento local. A nota é a soma dos itens que você marcou em relação ao total.",
  },
  {
    q: "Qual a diferença para a auditoria?",
    a: "O checklist é uma auto-avaliação: você responde sobre o seu perfil. A auditoria lê os dados públicos do Google automaticamente (em breve).",
  },
  {
    q: "O que fazer depois de preencher?",
    a: "Comece pela lista 'O que fazer primeiro' — são os itens de maior impacto que ainda faltam no seu perfil.",
  },
];

export default function ChecklistPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Checklist do Google Meu Negócio
          </h1>
          <p className="mt-2 text-muted">
            Marque o que você já faz no seu perfil e receba uma nota de 0 a 100 com
            as prioridades do que melhorar — de graça, sem cadastro.
          </p>
        </div>
        <ChecklistTool />
        <CtaSection />
        <Faq items={faq} />
      </main>
      <SiteFooter />
    </div>
  );
}
