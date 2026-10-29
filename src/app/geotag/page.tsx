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
      </main>
    </div>
  );
}
