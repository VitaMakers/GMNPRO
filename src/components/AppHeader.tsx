"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/geotag", label: "Geotag" },
  { href: "/agendamento", label: "Agendamentos" },
  { href: "/desempenho", label: "Desempenho" },
  { href: "/avaliacoes", label: "Avaliações" },
  { href: "/checklist", label: "Checklist" },
  { href: "/auditoria", label: "Auditoria" },
];

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [trial, setTrial] = useState<{ daysLeft: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/access");
        if (res.ok) {
          const d = await res.json();
          if (d.trial) setTrial({ daysLeft: d.daysLeft });
        }
      } catch {
        /* ignora */
      }
    })();
  }, []);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {trial && pathname !== "/assinar" && (
        <div className="bg-brand/15 px-4 py-2 text-center text-xs text-brand-2">
          Teste grátis: {trial.daysLeft} dia(s) restante(s).{" "}
          <Link href="/assinar" className="font-semibold underline">
            Assinar agora
          </Link>
        </div>
      )}
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
          <Link
            href="/assinar"
            className={`rounded-lg px-3 py-1.5 transition hover:bg-surface hover:text-foreground ${
              pathname === "/assinar" ? "bg-surface text-foreground" : "text-muted"
            }`}
          >
            Assinatura
          </Link>
          <button
            onClick={sair}
            className="ml-1 rounded-lg border border-border px-3 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
          >
            Sair
          </button>
        </nav>
      </div>
      </header>
    </>
  );
}
