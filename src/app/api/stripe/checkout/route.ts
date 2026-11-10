import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICES, type Plan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { plan } = (await request.json().catch(() => ({}))) as { plan?: Plan };
  const priceId = plan ? PRICES[plan] : undefined;
  if (!priceId) return NextResponse.json({ error: "plano_invalido" }, { status: 400 });

  const base = process.env.APP_BASE_URL || new URL(request.url).origin;

  try {
    const stripe = getStripe();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    const subscription_data: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { user_id: user.id, plan: plan ?? "" },
    };
    // Não cobra até o fim do teste gratuito que a pessoa já tem.
    const trialEndsMs = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
    if (trialEndsMs > Date.now() + 60 * 60 * 1000) {
      subscription_data.trial_end = Math.floor(trialEndsMs / 1000);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      success_url: `${base}/agendamento?assinado=1`,
      cancel_url: `${base}/assinar`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao iniciar o pagamento" },
      { status: 502 },
    );
  }
}
