/**
 * Esqueleto de carregamento das abas do app. Renderizado instantaneamente pelo
 * Next (loading.tsx / Suspense) enquanto o servidor busca os dados — dá sensação
 * de resposta imediata ao trocar de aba.
 */
export default function AppLoading({ title }: { title?: string }) {
  return (
    <div className="min-h-screen">
      {/* barra superior */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5">
          <div className="skeleton h-7 w-36 rounded-lg" />
          <div className="ml-auto h-8 w-28 skeleton rounded-full" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {title ? (
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground/90">{title}</h1>
        ) : (
          <div className="skeleton h-7 w-48 rounded-lg" />
        )}
        <div className="skeleton mt-2 h-4 w-72 rounded" />

        {/* linha de cartões */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-5">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton mt-3 h-8 w-20 rounded" />
              <div className="skeleton mt-4 h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* bloco grande */}
        <div className="skeleton mt-6 h-72 w-full rounded-2xl" />
      </main>
    </div>
  );
}
