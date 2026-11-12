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
}

const DAY = 24 * 60 * 60 * 1000;

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

  let { data } = await supabase
    .from("subscriptions")
    .select("trial_ends_at, status, manual_access, tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    const trialEnds = new Date(Date.now() + 7 * DAY).toISOString();
    await supabase
      .from("subscriptions")
      .upsert({ user_id: userId, trial_ends_at: trialEnds }, { onConflict: "user_id" });
    data = { trial_ends_at: trialEnds, status: null, manual_access: false, tier: "essencial" };
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

  return { allowed: false, trial: false, daysLeft: 0, status, tier, entitlements: ent };
}
