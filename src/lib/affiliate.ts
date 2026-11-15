/**
 * Regras do programa de afiliados.
 * - Comissão: 20% do PRIMEIRO pagamento do indicado (quando cai na Stripe).
 * - Bônus: a cada 2 indicados que pagam, o afiliado ganha 50% da mensalidade
 *   do mês seguinte (aplicado/pago manualmente; aqui só calculamos o devido).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMISSION_PCT = 0.2;
export const BONUS_EVERY = 2;
export const BONUS_PCT = 0.5;

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

/** Marca a indicação como paga e calcula a comissão (20% do 1º pagamento). */
export async function recordFirstPayment(
  admin: SupabaseClient,
  referredUserId: string,
  amountCents: number,
): Promise<void> {
  try {
    const { data: ref } = await admin
      .from("affiliate_referrals")
      .select("id, status")
      .eq("referred_user_id", referredUserId)
      .maybeSingle();
    if (!ref || (ref as { status: string }).status === "paid") return;
    const commission = Math.round(amountCents * COMMISSION_PCT);
    await admin
      .from("affiliate_referrals")
      .update({
        status: "paid",
        first_payment_cents: amountCents,
        commission_cents: commission,
        paid_at: new Date().toISOString(),
      })
      .eq("id", (ref as { id: string }).id);
  } catch {
    /* não quebra o webhook */
  }
}
