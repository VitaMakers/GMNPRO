import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const VALID = new Set(["essencial", "agencia2", "agencia4"]);

/** Admin define o plano (tier) de um usuário. Grava no metadata (que tem
 *  prioridade em getAccess) e na tabela subscriptions. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "nao_autorizado" }, { status: 403 });
  }

  const { userId, tier } = (await request.json().catch(() => ({}))) as { userId?: string; tier?: string };
  if (!userId || !tier || !VALID.has(tier)) {
    return NextResponse.json({ error: "dados_invalidos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) metadata (prioritário em getAccess) — marca também plan_chosen.
  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { plan_tier: tier, plan_chosen: true },
  });
  if (metaErr) return NextResponse.json({ error: metaErr.message }, { status: 500 });

  // 2) subscriptions.tier (best-effort; coluna pode não existir).
  try {
    await admin
      .from("subscriptions")
      .upsert({ user_id: userId, tier, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {
    /* ignora */
  }

  return NextResponse.json({ ok: true, tier });
}
