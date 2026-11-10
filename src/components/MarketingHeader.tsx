import Link from "next/link";

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          GMN <span className="text-brand-2">PRO</span>
        </Link>
        <nav className="flex items-center gap-1.5 text-sm">
          <Link href="/recursos" className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground">
            Recursos
          </Link>
          <Link href="/planos" className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground">
            Planos
          </Link>
          <Link href="/entrar" className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground">
            Entrar
          </Link>
          <Link
            href="/entrar?signup=1"
            className="ml-1 rounded-lg bg-brand px-3.5 py-1.5 font-medium text-white transition hover:opacity-90"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}
