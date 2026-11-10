import Link from "next/link";

export default function MarketingHeader() {
  return (
    <header className="sticky top-3 z-40 px-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-border bg-white/90 px-5 py-2.5 shadow-sm backdrop-blur">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          GMN <span className="text-brand-2">PRO</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <Link href="/recursos" className="transition hover:text-foreground">Recursos</Link>
          <Link href="/planos" className="transition hover:text-foreground">Planos</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/entrar" className="font-medium text-muted transition hover:text-foreground">
            Entrar
          </Link>
          <Link
            href="/planos"
            className="rounded-full bg-foreground px-5 py-2 font-semibold text-white transition hover:opacity-90"
          >
            Assinar
          </Link>
        </div>
      </div>
    </header>
  );
}
