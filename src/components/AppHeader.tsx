"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleG } from "@/components/GoogleBadge";
import { BrandMark, BrandWordmark } from "@/components/BrandLogo";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import AppSidebar from "@/components/AppSidebar";
import OnboardingTour from "@/components/OnboardingTour";
import { whatsappLink } from "@/lib/support";

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
  const [isAffiliate, setIsAffiliate] = useState(false);

  // Afiliado: mostra a aba "Indicação" só para quem tem um código liberado.
  // A RLS garante que cada pessoa só enxerga o próprio registro.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) return;
        const { data } = await sb
          .from("affiliates")
          .select("code")
          .eq("user_id", user.id)
          .eq("active", true)
          .maybeSingle();
        if (alive && data) setIsAffiliate(true);
      } catch {
        /* sem afiliado: aba oculta */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
            <Link href="/desempenho" aria-label="GMN Profile" className="flex shrink-0 items-start gap-2">
              <BrandMark className="mt-0.5 h-7 w-auto" />
              <span className="flex flex-col items-start gap-1">
                <BrandWordmark className="text-lg" />
                <span
                  title="Integração oficial com a API do Google Perfil da Empresa"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted"
                >
                  <GoogleG className="h-3 w-3" />
                  API oficial
                </span>
              </span>
            </Link>

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
              <a
                href={whatsappLink("Olá! Preciso de ajuda com o GMN Profile.")}
                target="_blank"
                rel="noopener noreferrer"
                title="Falar com o suporte no WhatsApp"
                aria-label="Falar com o suporte no WhatsApp"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-2 px-3 py-1.5 font-medium text-white transition hover:opacity-90 sm:px-3.5"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.17c-.25.7-1.44 1.33-1.98 1.38-.53.06-1.03.26-3.47-.72-2.92-1.15-4.78-4.15-4.93-4.34-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.26-.29.57-.36.76-.36l.55.01c.18 0 .42-.07.65.5.25.6.84 2.08.91 2.23.07.14.12.31.02.5-.1.2-.14.31-.29.48-.14.17-.3.38-.43.5-.14.15-.29.3-.12.59.17.29.74 1.22 1.59 1.98 1.1.97 2.02 1.28 2.31 1.42.29.14.46.12.63-.07.18-.2.73-.85.92-1.14.2-.29.39-.24.66-.14.26.1 1.67.79 1.96.93.29.14.48.22.55.34.07.12.07.7-.18 1.4Z" />
                </svg>
                <span className="hidden sm:inline">Suporte</span>
              </a>
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
            {isAffiliate && (
              <Link
                href="/afiliado"
                className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition hover:bg-surface hover:text-foreground ${
                  pathname === "/afiliado" ? "bg-brand/10 text-brand-2" : "text-muted"
                }`}
              >
                Indicação
              </Link>
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

      <AppSidebar isAdmin={isAdmin} isAgency={isAgency} isAffiliate={isAffiliate} />
      <OnboardingTour />
    </>
  );
}
