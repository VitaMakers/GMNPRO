import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            G
          </span>
          <span>
            GMN <span className="text-brand">PRO</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/geotag"
            className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
          >
            Geotag
          </Link>
          <Link
            href="/checklist"
            className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
          >
            Checklist
          </Link>
          <Link
            href="/auditoria"
            className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
          >
            Auditoria
          </Link>
          <Link
            href="/agendamento"
            className="rounded-lg bg-brand/10 px-3 py-1.5 font-medium text-brand transition hover:bg-brand/20"
          >
            Agendar
          </Link>
        </nav>
      </div>
    </header>
  );
}
