import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveOwnerId } from "./team";

/**
 * Checagem de acesso para AUTOMAÇÕES (cron), sem depender de sessão de login.
 * Uma conta é "ativa" quando:
 *  - tem acesso manual (liberado pela agência/admin), ou
 *  - a assinatura no Stripe está "active" ou "trialing", ou
 *  - ainda está dentro do teste gratuito (trial_ends_at no futuro).
 * Caso contrário (teste encerrado sem pagar, cancelado, past_due) → NÃO ativa.
 */
export interface SubLike {
  status?: string | null;
  manual_access?: boolean | null;
  trial_ends_at?: string | null;
}

export function isAccountActive(sub: SubLike | null | undefined): boolean {
  if (!sub) return false;
  if (sub.manual_access) return true;
  if (sub.status === "active" || sub.status === "trialing") return true;
  const t = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
  return t > Date.now();
}

/**
 * Dado um conjunto de user_ids (donos de posts/perfis), devolve o subconjunto
 * que está BLOQUEADO (testou e não assinou, cancelou, etc.).
 *
 * Regras de segurança para não bloquear por engano:
 *  - resolve o "dono efetivo" (membro de equipe herda o plano do dono);
 *  - só bloqueia quem TEM registro de assinatura e está inativo. Sem registro
 *    (caso raro/edge) não bloqueia, para nunca travar um cliente legítimo.
 */
export async function blockedUserIds(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Set();

  // id original -> dono efetivo
  const ownerOf = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      ownerOf.set(id, await resolveOwnerId(admin, id));
    }),
  );

  const ownerIds = [...new Set([...ownerOf.values()])];
  const { data } = await admin
    .from("subscriptions")
    .select("user_id, status, manual_access, trial_ends_at")
    .in("user_id", ownerIds);

  const subByOwner = new Map<string, SubLike>(
    ((data as Array<{ user_id: string } & SubLike> | null) ?? []).map((s) => [s.user_id, s]),
  );

  const blocked = new Set<string>();
  for (const id of ids) {
    const ownerId = ownerOf.get(id)!;
    const sub = subByOwner.get(ownerId);
    if (!sub) continue; // sem registro → não bloqueia
    if (!isAccountActive(sub)) blocked.add(id);
  }
  return blocked;
}
