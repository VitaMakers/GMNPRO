/**
 * Créditos de geo-grid. Regras:
 * - Teste grátis: 0 créditos (nunca).
 * - Plano pago (active) / acesso manual (comp) / admin: recarrega para
 *   entitlements.monthlyCredits uma vez por mês (credits_period = "AAAA-MM").
 * - Cada ponto da grade consome 1 crédito, debitado só após a análise rodar.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Access } from "./access";

const PAID_STATUSES = new Set(["active", "manual", "comp", "admin"]);

export function creditsEligible(access: Access): boolean {
  return access.allowed && !access.trial && PAID_STATUSES.has(access.status ?? "") && access.entitlements.monthlyCredits > 0;
}

export async function getCredits(supabase: SupabaseClient, userId: string, access: Access): Promise<number> {
  if (!creditsEligible(access)) return 0;
  const ym = new Date().toISOString().slice(0, 7);
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("credits, credits_period")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return 0; // coluna/migração ausente
    const row = data as { credits?: number; credits_period?: string | null } | null;
    if (!row || row.credits_period !== ym) {
      // Recarga mensal.
      const credits = access.entitlements.monthlyCredits;
      await supabase
        .from("subscriptions")
        .upsert({ user_id: userId, credits, credits_period: ym }, { onConflict: "user_id" });
      return credits;
    }
    return row.credits ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Debita créditos de forma ATÔMICA: a gravação só vale se o saldo ainda for o
 * que acabamos de ler (trava otimista). Assim, pedidos simultâneos não
 * conseguem gastar o mesmo saldo duas vezes. Devolve false se não houver saldo.
 */
export async function spendCredits(supabase: SupabaseClient, userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase.from("subscriptions").select("credits").eq("user_id", userId).maybeSingle();
    const current = (data as { credits?: number } | null)?.credits ?? 0;
    if (current < amount) return false;
    const { data: done, error } = await supabase
      .from("subscriptions")
      .update({ credits: current - amount })
      .eq("user_id", userId)
      .eq("credits", current)
      .select("user_id");
    if (error) return false;
    if (Array.isArray(done) && done.length === 1) return true;
    // Outro pedido mexeu no saldo no meio do caminho: lê de novo e tenta outra vez.
  }
  return false;
}

/** Devolve créditos (estorno) quando a operação cobrada falhou ou não trouxe resultado. */
export async function refundCredits(supabase: SupabaseClient, userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase.from("subscriptions").select("credits").eq("user_id", userId).maybeSingle();
    const current = (data as { credits?: number } | null)?.credits ?? 0;
    const { data: done, error } = await supabase
      .from("subscriptions")
      .update({ credits: current + amount })
      .eq("user_id", userId)
      .eq("credits", current)
      .select("user_id");
    if (error) break;
    if (Array.isArray(done) && done.length === 1) return;
  }
  console.error(`[creditos] estorno de ${amount} crédito(s) não aplicado para ${userId}`);
}
