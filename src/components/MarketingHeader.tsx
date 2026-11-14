import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function MarketingHeader() {
  return (
    <header className="sticky top-3 z-40 px-3">
      <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center rounded-full border border-border bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur">
        <div className="justify-self-start">
          <BrandLogo href="/" markClassName="h-6 w-auto" textClassName="text-base" />
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          <Link href="/recursos" className="transition hover:text-foreground">Recursos</Link>
          <Link href="/planos" className="transition hover:text-foreground">Planos</Link>
        </nav>
        <div className="flex items-center justify-self-end gap-2.5 text-sm">
          <Link href="/entrar" className="hidden font-medium text-muted transition hover:text-foreground sm:inline">
            Entrar
          </Link>
          <Link
            href="/planos"
            className="rounded-full bg-foreground px-4 py-1.5 font-semibold text-white transition hover:opacity-90"
          >
            Assinar
          </Link>
        </div>
      </div>
    </header>
  );
}
