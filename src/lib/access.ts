import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "./stripe";
import { entitlementsFor, ADMIN_ENTITLEMENTS, type Entitlements } from "./entitlements";

export interface Access {
  allowed: boolean;
  trial: boolean;
  daysLeft: number;
  status: string | null;
  tier: string;
  entitlements: Entitlements;
  /** Dias até a exclusão automática da conta (só quando bloqueado por falta de pagamento). */
  deletionInDays?: number | null;
  /** true quando a pessoa ainda não escolheu um plano (precisa escolher para entrar). */
  needsPlan?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
// Após o teste, a conta é mantida por este período antes da exclusão automática.
export const GRACE_DAYS = 90; // 3 meses

/**
 * Decide se o usuário tem acesso ao app:
 * - admin: sempre.
 * - assinatura ativa/trialing no Stripe: sim.
 * - dentro do teste gratuito (trial_ends_at futuro): sim (com dias restantes).
 * - caso contrário: não (vai para /assinar).
 * Cria a linha de assinatura com 7 dias de teste se ainda não existir.
 */
export async function getAccess(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<Access> {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    return { allowed: true, trial: false, daysLeft: 0, status: "admin", tier: "agencia4", entitlements: ADMIN_ENTITLEMENTS };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Sem linha de assinatura = ainda não escolheu nenhum plano → precisa
  // escolher antes de entrar (a linha e o teste de 7 dias nascem na escolha).
  if (!data) {
    return {
      allowed: false,
      trial: false,
      daysLeft: 0,
      status: null,
      tier: "essencial",
      entitlements: entitlementsFor("essencial"),
      needsPlan: true,
    };
  }

  const tier = (data.tier as string) ?? "essencial";
  const ent = entitlementsFor(tier);

  // Acesso liberado pela agência: sempre permitido, sem cobrança.
  if (data.manual_access) {
    return { allowed: true, trial: false, daysLeft: 0, status: "comp", tier, entitlements: ent };
  }

  const status = data.status ?? null;
  if (status === "active" || status === "trialing") {
    return { allowed: true, trial: false, daysLeft: 0, status, tier, entitlements: ent };
  }


  const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at).getTime() : 0;
  const now = Date.now();
  if (trialEnds > now) {
    return { allowed: true, trial: true, daysLeft: Math.ceil((trialEnds - now) / DAY), status, tier, entitlements: ent };
  }

  // Bloqueado por falta de pagamento: calcula quantos dias faltam para a
  // exclusão automática da conta (3 meses após o fim do teste).
  const deletionAt = trialEnds ? trialEnds + GRACE_DAYS * DAY : 0;
  const deletionInDays = deletionAt ? Math.max(0, Math.ceil((deletionAt - now) / DAY)) : null;
  return { allowed: false, trial: false, daysLeft: 0, status, tier, entitlements: ent, deletionInDays };
}
