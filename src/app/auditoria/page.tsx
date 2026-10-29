import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuditTool from "@/components/AuditTool";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "Auditoria do Perfil — GMN PRO",
  description:
    "Analise como sua empresa aparece no Google Maps e veja o que melhorar na ficha do Google Meu Negócio.",
};

export default function AuditoriaPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Auditoria do Perfil</h1>
          <p className="mt-2 text-muted">
            Busque sua empresa pelo nome, escolha o local certo e veja o que
            melhorar na ficha do Google — com nota e lista de prioridades. A
            análise lê apenas dados públicos do Google Maps.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
          <p className="font-medium">A auditoria automática está em fase final de configuração.</p>
          <p className="mt-1 text-muted">
            Enquanto isso, use o{" "}
            <Link href="/checklist" className="font-medium text-brand hover:underline">
              Checklist do Google Meu Negócio
            </Link>{" "}
            — a auto-avaliação gratuita que já entrega sua nota e as prioridades.
          </p>
        </div>

        <AuditTool />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
