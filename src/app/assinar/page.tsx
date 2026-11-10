import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AssinarPlans from "@/components/AssinarPlans";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

export const metadata = { title: "Assinar — GMN PRO" };

export default async function AssinarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">Assine o GMN PRO</h1>
          {access.trial ? (
            <p className="mt-2 text-muted">
              Seu teste grátis termina em <span className="font-semibold text-foreground">{access.daysLeft} dia(s)</span>.
              Assine agora e a cobrança só começa quando o teste acabar.
            </p>
          ) : access.allowed ? (
            <p className="mt-2 text-muted">Sua assinatura está ativa. Obrigado! 💚</p>
          ) : (
            <p className="mt-2 text-muted">
              Seu teste gratuito terminou. Assine para continuar usando todos os recursos.
            </p>
          )}
        </div>
        <AssinarPlans />
        <ManageSubscriptionButton />
      </main>
    </div>
  );
}
