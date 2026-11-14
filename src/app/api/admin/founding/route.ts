import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS, getStripe } from "@/lib/stripe";
import type { Tier } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

/** Admin: cria um link de pagamento com valor customizado (ex.: cliente fundador R$80)
 *  e define o plano (tier) da conta. O webhook ativa a assinatura ao pagar. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "nao_autorizado" }, { status: 403 });
  }
  const { userId, amount, tier } = (await request.json().catch(() => ({}))) as { userId?: string; amount?: number; tier?: Tier };
  const cents = Math.round(Number(amount) * 100);
  if (!userId || !cents || cents < 500 || !tier) return NextResponse.json({ error: "dados_invalidos" }, { status: 400 });

  const admin = createAdminClient();
  const LABEL: Record<string, string> = { essencial: "Essencial", agencia2: "Agência 2", agencia4: "Agência 4" };
  const planName = LABEL[tier] ?? tier;
  try {
    const stripe = getStripe();
    const price = await stripe.prices.create({
      currency: "brl",
      unit_amount: cents,
      recurring: { interval: "month" },
      product_data: { name: `GMN Profile — ${planName}` },
    });
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { user_id: userId, tier, plan: "mensal", founding: "1" },
      subscription_data: { metadata: { user_id: userId, tier, plan: "mensal" } },
      after_completion: { type: "redirect", redirect: { url: (process.env.APP_BASE_URL || new URL(request.url).origin) + "/desempenho" } },
    });
    // Já aplica o plano na conta (metadados + tabela).
    await admin.auth.admin.updateUserById(userId, { user_metadata: { plan_tier: tier, plan_chosen: true } });
    try { await admin.from("subscriptions").upsert({ user_id: userId, tier, updated_at: new Date().toISOString() }, { onConflict: "user_id" }); } catch { /* ignora */ }

    return NextResponse.json({ ok: true, url: link.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
