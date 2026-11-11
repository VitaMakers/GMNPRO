import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
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
    q: "Como funciona a análise automática?",
    a: "Escolha um perfil conectado e o sistema lê o seu Google Meu Negócio (informações, fotos, postagens e avaliações) e marca sozinho os itens que já estão feitos, com a nota e o que falta.",
  },
  {
    q: "Como a nota é calculada?",
    a: "Cada item tem um peso conforme o impacto no ranqueamento local. A nota é a soma dos itens concluídos em relação ao total.",
  },
  {
    q: "Todos os itens são automáticos?",
    a: "A maioria sim. Alguns dependem de hábito (como pedir avaliações) ou não são expostos pela API do Google e continuam manuais — estão sem o selo ⚡ auto.",
  },
  {
    q: "O que fazer depois?",
    a: "Comece pela lista 'O que falta para concluir' — são os itens de maior impacto que ainda faltam no seu perfil.",
  },
];

export default async function ChecklistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) redirect("/assinar");

  const { data: connection } = await supabase
    .from("google_connections")
    .select("access_token")
    .maybeSingle();
  const connected = !!connection?.access_token;

  const { data: locs } = await supabase
    .from("gmb_locations")
    .select("location_name, title")
    .order("title", { ascending: true });
  const locations = (locs as { location_name: string; title: string | null }[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Checklist do Google Meu Negócio
          </h1>
          <p className="mt-1 text-sm text-muted">
            O sistema analisa o seu perfil automaticamente, dá a nota de 0 a 100 e mostra
            o que falta para concluir a otimização.
          </p>
        </div>
        <ChecklistTool locations={locations} connected={connected} />
        <CtaSection />
        <Faq items={faq} />
      </main>
      <SiteFooter />
    </div>
  );
}
