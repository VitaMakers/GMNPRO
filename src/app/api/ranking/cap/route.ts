import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Define o teto mensal de créditos de ranking de um perfil (null = sem limite). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { location?: string; cap?: number | null };
  if (!b.location) return NextResponse.json({ error: "sem_local" }, { status: 400 });
  const cap = b.cap == null || Number(b.cap) <= 0 ? null : Math.round(Number(b.cap));
  const { error } = await supabase.from("gmb_locations").update({ credit_cap: cap }).eq("user_id", user.id).eq("location_name", b.location);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cap });
}
