/**
 * Regras do programa de afiliados.
 * - Comissão RECORRENTE: 10% de CADA mensalidade paga do indicado (enquanto
 *   ele continuar cliente). Cada fatura paga vira uma linha no extrato
 *   affiliate_commissions (idempotente por invoice_id).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMISSION_PCT = 0.1;
// 0 = vitalício (comissiona toda mensalidade enquanto o cliente pagar).
// Defina, por exemplo, 12 para limitar a 12 mensalidades por indicado.
export const COMMISSION_MONTHS_CAP = 0;

/** Gera um código curto e legível a partir de um nome/base. */
export function makeAffiliateCode(base: string): string {
  const slug = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10) || "parceiro";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug}${rand}`;
}

export interface Affiliate {
  user_id: string;
  code: string;
  active: boolean;
}

export async function affiliateByCode(admin: SupabaseClient, code: string): Promise<Affiliate | null> {
  const { data } = await admin
    .from("affiliates")
    .select("user_id, code, active")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  return (data as Affiliate) ?? null;
}

/** Registra uma visita no link (não falha o fluxo se der erro). */
export async function recordClick(
  admin: SupabaseClient,
  code: string,
  visitor: string | null,
  referrer: string | null,
): Promise<void> {
  try {
    const aff = await affiliateByCode(admin, code);
    if (!aff) return;
    await admin.from("affiliate_clicks").insert({ code, visitor, referrer });
  } catch {
    /* ignora */
  }
}

/** Vincula um usuário recém-cadastrado ao afiliado do código (uma vez só). */
export async function attachReferral(
  admin: SupabaseClient,
  code: string,
  referredUserId: string,
): Promise<void> {
  try {
    const aff = await affiliateByCode(admin, code);
    if (!aff || aff.user_id === referredUserId) return; // sem autoindicação
    const { data: exists } = await admin
      .from("affiliate_referrals")
      .select("id")
      .eq("referred_user_id", referredUserId)
      .maybeSingle();
    if (exists) return;
    await admin.from("affiliate_referrals").insert({
      code,
      affiliate_user_id: aff.user_id,
      referred_user_id: referredUserId,
      status: "signed_up",
    });
  } catch {
    /* ignora */
  }
}

/**
 * Registra a comissão recorrente de 10% de UMA mensalidade paga do indicado.
 * Chamado no webhook a cada `invoice.payment_succeeded` com valor > 0.
 * Idempotente por `invoice_id` (não duplica se o Stripe reenviar o evento).
 * Respeita COMMISSION_MONTHS_CAP (0 = vitalício).
 */
export async function recordRecurringCommission(
  admin: SupabaseClient,
  referredUserId: string,
  amountCents: number,
  invoiceId: string,
): Promise<void> {
  try {
    if (amountCents <= 0 || !invoiceId) return;

    const { data: ref } = await admin
      .from("affiliate_referrals")
      .select("id, affiliate_user_id, code, status")
      .eq("referred_user_id", referredUserId)
      .maybeSingle();
    if (!ref) return;
    const r = ref as { id: string; affiliate_user_id: string; code: string; status: string };

    // Esta fatura já foi comissionada? (idempotência além do UNIQUE no banco)
    const { data: already } = await admin
      .from("affiliate_commissions")
      .select("id")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (already) return;

    // Quantas mensalidades deste indicado já foram comissionadas.
    const { count } = await admin
      .from("affiliate_commissions")
      .select("*", { count: "exact", head: true })
      .eq("referred_user_id", referredUserId);
    const paidMonths = count ?? 0;
    if (COMMISSION_MONTHS_CAP > 0 && paidMonths >= COMMISSION_MONTHS_CAP) return;

    const commission = Math.round(amountCents * COMMISSION_PCT);
    await admin.from("affiliate_commissions").insert({
      affiliate_user_id: r.affiliate_user_id,
      referred_user_id: referredUserId,
      code: r.code,
      invoice_id: invoiceId,
      amount_cents: amountCents,
      commission_cents: commission,
      month_index: paidMonths + 1,
    });

    // Marca a indicação como "pagante" na 1ª comissão (para os painéis).
    if (r.status !== "paid") {
      await admin
        .from("affiliate_referrals")
        .update({ status: "paid", first_payment_cents: amountCents, paid_at: new Date().toISOString() })
        .eq("id", r.id);
    }
  } catch {
    /* não quebra o webhook */
  }
}
