import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "nao_autorizado" }, { status: 403 });
  }

  const { userId } = (await request.json().catch(() => ({}))) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "sem_usuario" }, { status: 400 });
  // Não deixa o admin se autoexcluir por acidente.
  if (userId === user.id) return NextResponse.json({ error: "nao_pode_excluir_a_si" }, { status: 400 });

  const admin = createAdminClient();

  // Pega email/telefone e dados da assinatura ANTES de excluir (para follow-up).
  const { data: target } = await admin.auth.admin.getUserById(userId);
  const meta = (target?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const phone = String(meta.phone ?? meta.whatsapp ?? "");
  const email = target?.user?.email ?? null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tier, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("lost_accounts").insert({
    user_id: userId,
    email,
    phone: phone || null,
    reason: "Excluída manualmente pelo admin",
    tier: (sub as { tier?: string } | null)?.tier ?? null,
    trial_ended_at: (sub as { trial_ends_at?: string } | null)?.trial_ends_at ?? null,
  });

  return NextResponse.json({ ok: true });
}
