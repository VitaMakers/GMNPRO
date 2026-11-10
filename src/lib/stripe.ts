import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada no ambiente.");
  return new Stripe(key);
}

export type Plan = "mensal" | "anual";

export const PRICES: Record<Plan, string> = {
  mensal: process.env.STRIPE_PRICE_MENSAL || "price_1UaLi0Ff39lDAMlWjWl4tFNV",
  anual: process.env.STRIPE_PRICE_ANUAL || "price_1UaLi0Ff39lDAMlWuH0HtKLv",
};

// E-mails que nunca são bloqueados (donos/admin).
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "contato@vitamakers.com.br")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
