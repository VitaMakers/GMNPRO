import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Auditoria do Perfil — GMN PRO",
  description:
    "Analise como sua empresa aparece no Google Maps e veja o que melhorar na ficha do Google Meu Negócio.",
};

const checks = [
  "Nome, categoria principal e categorias secundárias",
  "Descrição da empresa e palavras-chave",
  "Endereço, área de atendimento e horários",
  "Telefone, site e botão de ação",
  "Quantidade e frequência de fotos",
  "Data da última postagem",
  "Nota média e número de avaliações",
  "Avaliações respondidas pelo dono",
  "Perguntas e respostas (Q&A)",
  "Atributos e serviços preenchidos",
];

export default function AuditoriaPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Auditoria do Perfil</h1>
        <p className="mt-2 text-muted">
          Busque sua empresa pelo nome, escolha o local certo e veja o que
          melhorar na ficha do Google — com nota e lista de prioridades.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            Em construção
          </span>
          <h2 className="mt-4 text-lg font-semibold">O que a auditoria vai verificar</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-muted">
                <span className="mt-0.5 text-brand-2">●</span>
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            A análise lê apenas dados públicos do Google Maps, sem precisar de
            login nem permissão do dono do perfil.
          </p>
          <Link
            href="/geotag"
            className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Enquanto isso, prepare suas fotos →
          </Link>
        </div>
      </main>
    </div>
  );
}
