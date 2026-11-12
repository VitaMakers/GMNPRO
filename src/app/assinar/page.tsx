import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MinimalHeader from "@/components/MinimalHeader";
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

  // Novos usuários (sem plano) ou bloqueados veem só a tela de escolher plano,
  // sem o menu/abas do sistema. Quem já tem acesso vê o cabeçalho completo.
  const minimal = !access.allowed;

  return (
    <div className="min-h-screen">
      {minimal ? <MinimalHeader /> : <AppHeader />}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">Assine o GMN PRO</h1>
          {access.needsPlan ? (
            <p className="mt-2 text-muted">
              Escolha um plano para começar seu <span className="font-semibold text-foreground">teste grátis de 7 dias</span> —
              sem cartão. A cobrança só começa depois do teste.
            </p>
          ) : access.trial ? (
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

        {!access.allowed && access.deletionInDays !== null && access.deletionInDays !== undefined && (
          <div className="mb-8 rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-center text-sm text-red-600">
            <p className="font-semibold">
              ⚠️ Sua conta e seus dados serão excluídos em {access.deletionInDays} dia
              {access.deletionInDays === 1 ? "" : "s"}.
            </p>
            <p className="mt-1 text-red-500">
              Motivo: o período de teste terminou e não houve pagamento. Assine antes disso para
              manter seus perfis, posts e configurações. Depois da exclusão, não há como recuperar.
            </p>
          </div>
        )}

        <AssinarPlans trial={access.trial || !!access.needsPlan} currentTier={access.tier} />
        {access.allowed && <ManageSubscriptionButton />}
      </main>
    </div>
  );
}
