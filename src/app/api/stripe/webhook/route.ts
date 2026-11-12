import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "config" }, { status: 400 });

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "assinatura_invalida" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ts = () => new Date().toISOString();
  const periodEnd = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

  async function updateByCustomer(customerId: string, fields: Record<string, unknown>) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.user_id) {
      await admin.from("subscriptions").update({ ...fields, updated_at: ts() }).eq("user_id", data.user_id);
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id || (s.metadata?.user_id as string | undefined);
      const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
      let status = "active";
      let cpe: string | null = null;
      const plan = (s.metadata?.plan as string) ?? null;
      const tier = (s.metadata?.tier as string) || "essencial";
      if (subId) {
        const full = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription & {
          current_period_end?: number;
        };
        status = full.status;
        cpe = periodEnd(full.current_period_end);
      }
      if (userId) {
        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subId ?? null,
            status,
            plan,
            tier,
            current_period_end: cpe,
            updated_at: ts(),
          },
          { onConflict: "user_id" },
        );
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.created"
    ) {
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number };
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const subTier = (sub.metadata?.tier as string) || undefined;
      await updateByCustomer(customerId, {
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEnd(sub.current_period_end),
        ...(subTier ? { tier: subTier } : {}),
      });
    } else if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (customerId) await updateByCustomer(customerId, { status: "past_due" });
    }
  } catch {
    return NextResponse.json({ error: "handler" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
