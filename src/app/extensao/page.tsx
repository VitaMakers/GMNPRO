import AppHeader from "@/components/AppHeader";

export const metadata = { title: "Extensão de Pré-análise — GMN PRO" };

const steps = [
  "Baixe a pasta da extensão (peça ao suporte o arquivo .zip e descompacte).",
  "Abra chrome://extensions no Google Chrome.",
  'Ligue o "Modo do desenvolvedor" (canto superior direito).',
  'Clique em "Carregar sem compactação" e selecione a pasta da extensão.',
  "Faça login no GMN PRO neste mesmo navegador.",
];

export default function ExtensaoPage() {
  const extUrl = process.env.NEXT_PUBLIC_EXTENSION_URL;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Extensão de Pré-análise</h1>
          <p className="mt-1 text-sm text-muted">
            Analise qualquer perfil do Google com o máximo de dados — posts, perguntas e respostas e
            atributos — <strong>sem custo</strong>. A leitura acontece no seu navegador.
          </p>
        </div>

        {extUrl && (
          <a href={extUrl} target="_blank" rel="noopener noreferrer"
            className="mb-6 inline-block rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90">
            Instalar pela Chrome Web Store
          </a>
        )}

        <div className="rounded-3xl border border-border bg-white card-soft p-6">
          <h2 className="mb-3 font-semibold">Como instalar (modo desenvolvedor)</h2>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
            <p className="font-medium">Como usar</p>
            <p className="mt-1 text-muted">Abra a ficha de uma empresa no Google Maps → clique no ícone da extensão → <strong>Analisar este perfil</strong>. A pré-análise completa abre aqui no GMN PRO.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
