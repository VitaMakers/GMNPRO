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

  const { userId, grant } = (await request.json().catch(() => ({}))) as {
    userId?: string;
    grant?: boolean;
  };
  if (!userId) return NextResponse.json({ error: "sem_usuario" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .upsert(
      { user_id: userId, manual_access: !!grant, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
