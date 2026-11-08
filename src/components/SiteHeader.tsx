import Link from "next/link";

const links = [
  { href: "/geotag", label: "Geotag" },
  { href: "/agendamento", label: "Agendamentos" },
  { href: "/desempenho", label: "Desempenho" },
  { href: "/checklist", label: "Checklist" },
  { href: "/auditoria", label: "Auditoria" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center font-semibold">
          <span className="font-display text-lg tracking-tight">
            GMN <span className="text-brand-2">PRO</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
