import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { listTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const access = await getAccess(supabase, user.id, user.email);
  return { supabase, user, access };
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  // Só o DONO gerencia a equipe (membros não).
  if (c.access.isMember) return NextResponse.json({ error: "apenas_dono", detail: "Sua conta é membro de uma equipe." }, { status: 403 });
  const members = await listTeam(c.supabase, c.user.id);
  const seats = c.access.entitlements.maxUsers + (await extraSeats(c.user.id));
  return NextResponse.json({ members, used: members.length + 1, seats, isAgency: c.access.entitlements.isAgency });
}

async function extraSeats(ownerId: string): Promise<number> {
  try { const admin = createAdminClient(); const { data } = await admin.from("subscriptions").select("extra_seats").eq("user_id", ownerId).maybeSingle(); return (data as { extra_seats?: number } | null)?.extra_seats ?? 0; } catch { return 0; }
}

export async function POST(request: Request) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  if (!c.access.entitlements.isAgency) return NextResponse.json({ error: "recurso_de_agencia" }, { status: 403 });
  if (c.access.isMember) return NextResponse.json({ error: "apenas_dono" }, { status: 403 });

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const e = (email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return NextResponse.json({ error: "email_invalido" }, { status: 400 });
  if (e === (c.user.email ?? "").toLowerCase()) return NextResponse.json({ error: "voce_mesmo", detail: "Esse é o seu e-mail (dono)." }, { status: 400 });

  const members = await listTeam(c.supabase, c.user.id);
  const seats = c.access.entitlements.maxUsers + (await extraSeats(c.user.id));
  if (members.length + 1 >= seats) {
    return NextResponse.json({ error: "sem_assentos", detail: `Seu plano permite ${seats} usuários. Compre um usuário extra para adicionar mais.` }, { status: 402 });
  }

  const { error } = await c.supabase.from("team_members").upsert({ owner_id: c.user.id, member_email: e, role: "member" }, { onConflict: "owner_id,member_email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  if (c.access.isMember) return NextResponse.json({ error: "apenas_dono" }, { status: 403 });
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (!email) return NextResponse.json({ error: "sem_email" }, { status: 400 });
  await c.supabase.from("team_members").delete().eq("owner_id", c.user.id).eq("member_email", email.toLowerCase());
  return NextResponse.json({ ok: true });
}
