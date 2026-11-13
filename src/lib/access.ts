import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "./stripe";
import { entitlementsFor, ADMIN_ENTITLEMENTS, type Entitlements } from "./entitlements";
import { createAdminClient } from "./supabase/server";
import { resolveOwnerId } from "./team";

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
  /** Conta efetiva: o próprio usuário, ou o dono quando ele é membro de uma equipe. */
  accountId: string;
  /** true quando o usuário é membro da equipe de outra conta (não o dono). */
  isMember?: boolean;
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
    return { allowed: true, trial: false, daysLeft: 0, status: "admin", tier: "agencia4", entitlements: ADMIN_ENTITLEMENTS, accountId: userId };
  }

  // Equipe: se este usuário é membro de outra conta, herda o plano do dono.
  let accountId = userId;
  let isMember = false;
  let ownerMeta: Record<string, unknown> | null = null;
  try {
    const admin = createAdminClient();
    const owner = await resolveOwnerId(admin, userId, email);
    if (owner !== userId) {
      accountId = owner;
      isMember = true;
      const { data: ownerUser } = await admin.auth.admin.getUserById(owner);
      ownerMeta = (ownerUser?.user?.user_metadata ?? {}) as Record<string, unknown>;
    }
  } catch { /* sem admin/tabela: segue como dono */ }

  let meta: Record<string, unknown>;
  if (isMember && ownerMeta) {
    meta = ownerMeta;
  } else {
    const { data: authData } = await supabase.auth.getUser();
    meta = (authData?.user?.user_metadata ?? {}) as Record<string, unknown>;
  }
  const planChosen = meta.plan_chosen === true;
  const metaTier = typeof meta.plan_tier === "string" ? (meta.plan_tier as string) : null;

  // Assinatura da conta efetiva (dono). Membro lê via admin.
  let sub: Record<string, unknown> | null = null;
  if (isMember) {
    try { const admin = createAdminClient(); const { data } = await admin.from("subscriptions").select("*").eq("user_id", accountId).maybeSingle(); sub = data as Record<string, unknown> | null; } catch { sub = null; }
  } else {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", accountId).maybeSingle();
    sub = data as Record<string, unknown> | null;
  }

  const tier = metaTier ?? (sub?.tier as string) ?? "essencial";
  const ent = entitlementsFor(tier);
  const base = { tier, entitlements: ent, accountId, isMember };

  if (sub?.manual_access) return { allowed: true, trial: false, daysLeft: 0, status: "comp", ...base };
  const status = (sub?.status as string) ?? null;
  if (status === "active" || status === "trialing") return { allowed: true, trial: false, daysLeft: 0, status, ...base };
  if (!planChosen) return { allowed: false, trial: false, daysLeft: 0, status, ...base, needsPlan: true };

  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at as string).getTime() : 0;
  const now = Date.now();
  if (trialEnds > now) return { allowed: true, trial: true, daysLeft: Math.ceil((trialEnds - now) / DAY), status, ...base };

  const deletionAt = trialEnds ? trialEnds + GRACE_DAYS * DAY : 0;
  const deletionInDays = deletionAt ? Math.max(0, Math.ceil((deletionAt - now) / DAY)) : null;
  return { allowed: false, trial: false, daysLeft: 0, status, ...base, deletionInDays };
}
