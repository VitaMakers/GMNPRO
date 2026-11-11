"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleG } from "@/components/GoogleBadge";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import AppSidebar from "@/components/AppSidebar";

const links = [
  { href: "/desempenho", label: "Desempenho" },
  { href: "/geotag", label: "Geotag" },
  { href: "/agendamento", label: "Agendamentos" },
  { href: "/avaliacoes", label: "Avaliações" },
  { href: "/checklist", label: "Checklist" },
  { href: "/auditoria", label: "Auditoria" },
];

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [trial, setTrial] = useState<{ daysLeft: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/access");
        if (res.ok) {
          const d = await res.json();
          if (d.trial) setTrial({ daysLeft: d.daysLeft });
          if (d.status === "admin") setIsAdmin(true);
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

      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4">
          {/* Linha 1: marca · seletor de perfis · ações */}
          <div className="flex items-center gap-3 py-3">
            <Link
              href="/desempenho"
              className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight"
            >
              GMN <span className="text-brand-2">PRO</span>
            </Link>
            <span
              title="Integração oficial com a API do Google Perfil da Empresa"
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted xl:inline-flex"
            >
              <GoogleG className="h-3.5 w-3.5" />
              API oficial
            </span>

            <div className="min-w-0 flex-1">
              <ProfileSwitcher />
            </div>

            <div className="flex shrink-0 items-center gap-2 text-sm">
              <Link
                href="/assinar"
                className="hidden rounded-full border border-border px-3.5 py-1.5 font-medium text-muted transition hover:bg-surface hover:text-foreground sm:inline-flex"
              >
                Assinatura
              </Link>
              <button
                onClick={sair}
                className="rounded-full border border-border px-3.5 py-1.5 text-muted transition hover:bg-surface hover:text-foreground"
              >
                Sair
              </button>
            </div>
          </div>

          {/* Linha 2: abas (horizontais no mobile/tablet; viram trilho lateral no desktop) */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-2 text-sm xl:hidden">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition hover:bg-surface hover:text-foreground ${
                    active ? "bg-brand/10 text-brand-2" : "text-muted"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition hover:bg-surface hover:text-foreground ${
                  pathname === "/admin" ? "bg-brand/10 text-brand-2" : "text-muted"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      </header>

      <AppSidebar isAdmin={isAdmin} />
    </>
  );
}
