import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import ChecklistTool from "@/components/ChecklistTool";
import DescriptionTool from "@/components/DescriptionTool";
import CtaSection from "@/components/CtaSection";
import Faq from "@/components/Faq";

export const metadata: Metadata = {
  title: "Análise Completa do Google Meu Negócio — GMN PRO",
  description:
    "Análise completa e automática do seu perfil do Google Meu Negócio: nota de 0 a 100, mapa de locais, card detalhado e as prioridades do que melhorar.",
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

  // Tenta trazer coordenadas (migração 0016); cai para o básico se a coluna não existir.
  let locations: { location_name: string; title: string | null; lat?: number | null; lng?: number | null }[] = [];
  const withCoords = await supabase
    .from("gmb_locations")
    .select("location_name, title, lat, lng")
    .order("title", { ascending: true });
  if (withCoords.error) {
    const base = await supabase
      .from("gmb_locations")
      .select("location_name, title")
      .order("title", { ascending: true });
    locations = (base.data as typeof locations) ?? [];
  } else {
    locations = (withCoords.data as typeof locations) ?? [];
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Análise Completa
          </h1>
          <p className="mt-1 text-sm text-muted">
            O sistema lê o seu perfil do Google em tempo real, dá a nota de 0 a 100, mostra o
            mapa de locais e o que falta para concluir a otimização — sem extensão do Chrome.
          </p>
        </div>
        <ChecklistTool locations={locations} connected={connected} />
        {connected && locations.length > 0 && (
          <div className="mt-8">
            <DescriptionTool locations={locations} />
          </div>
        )}
        <CtaSection />
        <Faq items={faq} />
      </main>
      <SiteFooter />
    </div>
  );
}
