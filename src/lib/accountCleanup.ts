import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "./stripe";
import { GRACE_DAYS } from "./access";

const DAY = 24 * 60 * 60 * 1000;

interface SubRow {
  user_id: string;
  status: string | null;
  manual_access: boolean | null;
  trial_ends_at: string | null;
  tier: string | null;
}

/**
 * Exclui automaticamente contas que passaram do teste e não pagaram há mais
 * de GRACE_DAYS (3 meses). Protege: admins, acessos manuais (agência) e
 * assinantes ativos/em teste. Apaga o usuário no Auth; os dados vinculados
 * são removidos em cascata.
 *
 * Desligue com a variável de ambiente DISABLE_AUTO_DELETE=1.
 */
export async function runAccountCleanup(
  admin: SupabaseClient,
  { limit = 50, dryRun = false }: { limit?: number; dryRun?: boolean } = {},
): Promise<{ eligible: number; deleted: string[]; disabled: boolean }> {
  const disabled = !!process.env.DISABLE_AUTO_DELETE;

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, status, manual_access, trial_ends_at, tier");
  const subMap = new Map<string, SubRow>((subs as SubRow[] | null)?.map((s) => [s.user_id, s]) ?? []);

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersData?.users ?? [];

  const now = Date.now();
  const deleted: string[] = [];
  let eligible = 0;

  for (const u of users) {
    if (u.email && ADMIN_EMAILS.includes(u.email.toLowerCase())) continue;

    const s = subMap.get(u.id);
    const status = s?.status ?? null;
    if (s?.manual_access) continue; // liberado pela agência
    if (status === "active" || status === "trialing") continue; // pagante/assinou

    const trialEnds = s?.trial_ends_at ? new Date(s.trial_ends_at).getTime() : null;
    if (!trialEnds) continue; // sem data base, não mexe
    const deletionAt = trialEnds + GRACE_DAYS * DAY;
    if (deletionAt > now) continue; // ainda dentro do prazo

    eligible++;
    if (disabled || dryRun) continue;
    if (deleted.length >= limit) continue;

    // Guarda o contato ANTES de excluir, para follow-up.
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const phone = String(meta.phone ?? meta.whatsapp ?? "");

    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (!error) {
      deleted.push(u.email ?? u.id);
      await admin.from("lost_accounts").insert({
        user_id: u.id,
        email: u.email ?? null,
        phone: phone || null,
        reason: "Teste encerrado sem pagamento (exclusão automática após 3 meses)",
        tier: s?.tier ?? null,
        trial_ended_at: s?.trial_ends_at ?? null,
      });
    }
  }

  return { eligible, deleted, disabled };
}
