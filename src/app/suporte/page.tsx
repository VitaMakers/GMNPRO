import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { whatsappLink, supportWhatsappDisplay, SUPPORT_EMAIL } from "@/lib/support";

export const metadata = { title: "Suporte — GMN Profile" };

export default async function SuportePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email, { meta: user.user_metadata });
  if (!access.allowed) redirect("/assinar");

  const msg = "Olá! Preciso de ajuda com o GMN Profile.";

  return (
    <div className="min-h-screen">
      <AppHeader isAgency={access.entitlements.isAgency} isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
      <main className="page-enter mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Falar com o suporte</h1>
          <p className="mt-1 text-sm text-muted">
            Estamos aqui para ajudar. Fale com a nossa equipe pelo WhatsApp e responda suas
            dúvidas sobre o GMN Profile.
          </p>
        </div>

        {/* Card principal WhatsApp */}
        <div className="rounded-3xl border border-border bg-white p-6 card-soft">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand-2">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.17c-.25.7-1.44 1.33-1.98 1.38-.53.06-1.03.26-3.47-.72-2.92-1.15-4.78-4.15-4.93-4.34-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.26-.29.57-.36.76-.36l.55.01c.18 0 .42-.07.65.5.25.6.84 2.08.91 2.23.07.14.12.31.02.5-.1.2-.14.31-.29.48-.14.17-.3.38-.43.5-.14.15-.29.3-.12.59.17.29.74 1.22 1.59 1.98 1.1.97 2.02 1.28 2.31 1.42.29.14.46.12.63-.07.18-.2.73-.85.92-1.14.2-.29.39-.24.66-.14.26.1 1.67.79 1.96.93.29.14.48.22.55.34.07.12.07.7-.18 1.4Z" />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-lg font-semibold">Suporte no WhatsApp</p>
              <p className="text-sm text-muted">
                Atendimento humano, em horário comercial. Normalmente respondemos em poucos minutos.
              </p>
              <p className="mt-1 text-sm font-medium text-brand-2">{supportWhatsappDisplay()}</p>
            </div>
            <a
              href={whatsappLink(msg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.17c-.25.7-1.44 1.33-1.98 1.38-.53.06-1.03.26-3.47-.72-2.92-1.15-4.78-4.15-4.93-4.34-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.26-.29.57-.36.76-.36l.55.01c.18 0 .42-.07.65.5.25.6.84 2.08.91 2.23.07.14.12.31.02.5-.1.2-.14.31-.29.48-.14.17-.3.38-.43.5-.14.15-.29.3-.12.59.17.29.74 1.22 1.59 1.98 1.1.97 2.02 1.28 2.31 1.42.29.14.46.12.63-.07.18-.2.73-.85.92-1.14.2-.29.39-.24.66-.14.26.1 1.67.79 1.96.93.29.14.48.22.55.34.07.12.07.7-.18 1.4Z" />
              </svg>
              Falar no WhatsApp
            </a>
          </div>
        </div>

        {/* E-mail */}
        <div className="mt-4 rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="text-sm font-semibold">Prefere e-mail?</p>
          <p className="mt-1 text-sm text-muted">
            Escreva para{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-2 hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            e retornamos assim que possível.
          </p>
        </div>

        {/* Dicas rápidas */}
        <div className="mt-4 rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="text-sm font-semibold">Antes de chamar, pode ajudar:</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="mt-0.5 text-brand-2">•</span> Diga qual perfil do Google você está usando.</li>
            <li className="flex gap-2"><span className="mt-0.5 text-brand-2">•</span> Se for um erro, mande um print da tela.</li>
            <li className="flex gap-2"><span className="mt-0.5 text-brand-2">•</span> Conte o que você tentou fazer e o que aconteceu.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
