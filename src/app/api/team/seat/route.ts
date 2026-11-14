import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/** Checkout de usuário extra (R$48,50/mês). O webhook incrementa extra_seats. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const access = await getAccess(supabase, user.id, user.email);
  if (!access.entitlements.isAgency || access.isMember) return NextResponse.json({ error: "nao_permitido" }, { status: 403 });

  const base = process.env.APP_BASE_URL || new URL(request.url).origin;
  try {
    const stripe = getStripe();
    const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    let customerId = sub?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      customerId = customer.id;
      await supabase.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ quantity: 1, price_data: { currency: "brl", recurring: { interval: "month" }, unit_amount: 4850, product_data: { name: "GMN Profile — Usuário extra" } } }],
      metadata: { kind: "extra_seat", owner_id: user.id, user_id: user.id },
      success_url: `${base}/equipe?seat=1`,
      cancel_url: `${base}/equipe`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
