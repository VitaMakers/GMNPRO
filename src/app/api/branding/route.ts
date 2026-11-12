import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const { data } = await supabase.from("agency_branding").select("name, logo_url, color, phone, site").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ branding: data ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, string>;
  const row = {
    user_id: user.id,
    name: (b.name ?? "").slice(0, 80),
    logo_url: (b.logo_url ?? "").slice(0, 500),
    color: /^#[0-9a-fA-F]{6}$/.test(b.color ?? "") ? b.color : "#059669",
    phone: (b.phone ?? "").slice(0, 40),
    site: (b.site ?? "").slice(0, 200),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("agency_branding").upsert(row, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, branding: row });
}
