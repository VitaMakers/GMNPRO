import Stripe from "stripe";
import type { Tier, Cycle } from "./entitlements";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada no ambiente.");
  return new Stripe(key);
}

export type Plan = Cycle; // compat: "mensal" | "anual"

// Preços do Essencial (já existentes — mantidos).
export const PRICES: Record<Cycle, string> = {
  mensal: process.env.STRIPE_PRICE_MENSAL || "price_1UaLi0Ff39lDAMlWjWl4tFNV",
  anual: process.env.STRIPE_PRICE_ANUAL || "price_1UaLi0Ff39lDAMlWuH0HtKLv",
};

// Mapa completo tier → ciclo → Price ID (Stripe).
// Os IDs de agência devem ser criados na Stripe e colocados no ambiente (Vercel).
export const PRICE_IDS: Record<Tier, Record<Cycle, string>> = {
  essencial: {
    mensal: PRICES.mensal,
    anual: PRICES.anual,
  },
  agencia2: {
    mensal: process.env.STRIPE_PRICE_AGENCIA2_MENSAL || "",
    anual: process.env.STRIPE_PRICE_AGENCIA2_ANUAL || "",
  },
  agencia4: {
    mensal: process.env.STRIPE_PRICE_AGENCIA4_MENSAL || "",
    anual: process.env.STRIPE_PRICE_AGENCIA4_ANUAL || "",
  },
};

export function priceIdFor(tier: Tier, cycle: Cycle): string | undefined {
  return PRICE_IDS[tier]?.[cycle] || undefined;
}

// Valores dos planos (em centavos) — usados para criar o preço na hora do
// checkout (price_data), sem precisar cadastrar nada na Stripe.
export interface PlanPricing {
  amount: number;
  interval: "month" | "year";
  label: string;
}
export const PLAN_PRICING: Record<Tier, Record<Cycle, PlanPricing>> = {
  essencial: {
    mensal: { amount: 2000, interval: "month", label: "GMN Profile — Essencial (Mensal)" },
    anual: { amount: 22500, interval: "year", label: "GMN Profile — Essencial (Anual)" },
  },
  agencia2: {
    mensal: { amount: 9700, interval: "month", label: "GMN Profile — Agência 2 (Mensal)" },
    anual: { amount: 109100, interval: "year", label: "GMN Profile — Agência 2 (Anual)" },
  },
  agencia4: {
    mensal: { amount: 13000, interval: "month", label: "GMN Profile — Agência 4 (Mensal)" },
    anual: { amount: 146300, interval: "year", label: "GMN Profile — Agência 4 (Anual)" },
  },
};

/**
 * Monta o line_item do checkout:
 * - se houver um Price ID configurado (Essencial já tem; agência só se você
 *   criar na Stripe e colocar no env), usa ele;
 * - senão, cria o preço inline (price_data) com o valor da tabela acima.
 */
export function buildLineItem(tier: Tier, cycle: Cycle) {
  const existing = PRICE_IDS[tier]?.[cycle];
  if (existing) {
    return { price: existing, quantity: 1 as const };
  }
  const p = PLAN_PRICING[tier][cycle];
  return {
    quantity: 1 as const,
    price_data: {
      currency: "brl",
      unit_amount: p.amount,
      recurring: { interval: p.interval },
      product_data: { name: p.label },
    },
  };
}

/** Descobre o tier a partir de um Price ID (para o webhook). */
export function tierFromPriceId(priceId: string): Tier | null {
  for (const tier of Object.keys(PRICE_IDS) as Tier[]) {
    const cycles = PRICE_IDS[tier];
    if (cycles.mensal === priceId || cycles.anual === priceId) return tier;
  }
  return null;
}

// E-mails que nunca são bloqueados (donos/admin).
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "contato@vitamakers.com.br")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
