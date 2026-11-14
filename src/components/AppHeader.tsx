"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleG } from "@/components/GoogleBadge";
import BrandLogo from "@/components/BrandLogo";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import AppSidebar from "@/components/AppSidebar";
import OnboardingTour from "@/components/OnboardingTour";

const links = [
  { href: "/desempenho", label: "Desempenho" },
  { href: "/geotag", label: "Geotag" },
  { href: "/agendamento", label: "Agendamentos" },
  { href: "/avaliacoes", label: "Avaliações" },
  { href: "/checklist", label: "Análise Completa" },
  { href: "/auditoria", label: "Pré-análise" },
  { href: "/suporte", label: "Suporte" },
];

export default function AppHeader({
  isAgency: isAgencyProp,
  isAdmin: isAdminProp,
  trial: trialProp,
}: {
  isAgency?: boolean;
  isAdmin?: boolean;
  trial?: { daysLeft: number } | null;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  // Semeia com os valores que o servidor já conhece (evita o "pisca" do menu
  // abrindo curto e expandindo, e dispensa o fetch quando os props vêm prontos).
  const seeded = isAgencyProp !== undefined || isAdminProp !== undefined;
  const [trial, setTrial] = useState<{ daysLeft: number } | null>(trialProp ?? null);
  const [isAdmin, setIsAdmin] = useState(isAdminProp ?? false);
  const [isAgency, setIsAgency] = useState(isAgencyProp ?? false);

  useEffect(() => {
    if (seeded) return; // já veio pronto do servidor
    (async () => {
      try {
        const res = await fetch("/api/access");
        if (res.ok) {
          const d = await res.json();
          if (d.trial) setTrial({ daysLeft: d.daysLeft });
          if (d.status === "admin") setIsAdmin(true);
          if (d.entitlements?.isAgency) setIsAgency(true);
        }
      } catch {
        /* ignora */
      }
    })();
  }, [seeded]);

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
            <BrandLogo href="/desempenho" className="shrink-0" markClassName="h-7 w-auto" textClassName="text-lg" />
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
              <button
                onClick={() => window.dispatchEvent(new Event("gmnpro:open-tour"))}
                title="Ver tutorial"
                aria-label="Ver tutorial"
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted transition hover:bg-surface hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 1.8-2 3M12 17h.01" />
                </svg>
              </button>
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
          <nav className="flex items-center gap-1 overflow-x-auto pb-2 text-sm min-[1320px]:hidden">
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
            {isAgency && (
              <>
                <Link
                  href="/ranking"
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition hover:bg-surface hover:text-foreground ${
                    pathname === "/ranking" ? "bg-brand/10 text-brand-2" : "text-muted"
                  }`}
                >
                  Ranking
                </Link>
                <Link
                  href="/locais"
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition hover:bg-surface hover:text-foreground ${
                    pathname === "/locais" ? "bg-brand/10 text-brand-2" : "text-muted"
                  }`}
                >
                  Locais
                </Link>
                <Link
                  href="/equipe"
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition hover:bg-surface hover:text-foreground ${
                    pathname === "/equipe" ? "bg-brand/10 text-brand-2" : "text-muted"
                  }`}
                >
                  Equipe
                </Link>
              </>
            )}
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

      <AppSidebar isAdmin={isAdmin} isAgency={isAgency} />
      <OnboardingTour />
    </>
  );
}
