import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/stripe";
import { makeAffiliateCode } from "@/lib/affiliate";

export const dynamic = "force-dynamic";

/** Admin: transforma uma conta em afiliado (gera código único) ou devolve o existente. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "nao_autorizado" }, { status: 403 });
  }

  const { userId, email } = (await request.json().catch(() => ({}))) as { userId?: string; email?: string };
  if (!userId) return NextResponse.json({ error: "sem_usuario" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin.from("affiliates").select("code").eq("user_id", userId).maybeSingle();
  if (existing?.code) return NextResponse.json({ ok: true, code: existing.code, existed: true });

  let code = makeAffiliateCode(email || "parceiro");
  for (let i = 0; i < 6; i++) {
    const { error } = await admin.from("affiliates").insert({ user_id: userId, code });
    if (!error) return NextResponse.json({ ok: true, code });
    if (error.code === "23505") {
      // já existe (por user_id ou por código)
      const { data: again } = await admin.from("affiliates").select("code").eq("user_id", userId).maybeSingle();
      if (again?.code) return NextResponse.json({ ok: true, code: again.code, existed: true });
      code = makeAffiliateCode(email || "parceiro");
      continue;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "nao_gerou_codigo" }, { status: 500 });
}
