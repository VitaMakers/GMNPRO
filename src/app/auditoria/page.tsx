import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuditTool from "@/components/AuditTool";

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
        <AuditTool />
      </main>
    </div>
  );
}
