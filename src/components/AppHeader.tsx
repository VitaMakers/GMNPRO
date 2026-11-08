"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/geotag", label: "Geotag" },
  { href: "/agendamento", label: "Agendamentos" },
  { href: "/desempenho", label: "Desempenho" },
  { href: "/checklist", label: "Checklist" },
  { href: "/auditoria", label: "Auditoria" },
];

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/agendamento" className="font-display text-lg font-semibold tracking-tight">
          GMN <span className="text-brand-2">PRO</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 transition hover:bg-surface hover:text-foreground ${
                  active ? "bg-surface text-foreground" : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={sair}
            className="ml-1 rounded-lg border border-border px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
