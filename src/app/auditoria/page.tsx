import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AuditTool from "@/components/AuditTool";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "Auditoria do Perfil — GMN PRO",
  description:
    "Analise como sua empresa aparece no Google Maps e veja o que melhorar na ficha do Google Meu Negócio.",
};

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) redirect("/assinar");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">Auditoria do Perfil</h1>
          <p className="mt-1 text-sm text-muted">
            Busque sua empresa pelo nome, escolha o local certo e veja o que
            melhorar na ficha do Google — com nota e lista de prioridades. A
            análise lê apenas dados públicos do Google Maps.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
          <p className="font-medium">É o seu próprio perfil? O Checklist é mais completo.</p>
          <p className="mt-1 text-muted">
            Esta auditoria usa apenas dados públicos do Google Maps — ótima para analisar qualquer
            empresa (inclusive a de clientes em prospecção). Para um perfil que você conecta, o{" "}
            <Link href="/checklist" className="font-medium text-brand hover:underline">
              Checklist
            </Link>{" "}
            lê os dados reais da conta e entrega uma análise bem mais detalhada.
          </p>
        </div>

        <AuditTool />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
