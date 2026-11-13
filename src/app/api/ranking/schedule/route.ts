import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { GRID_SIZES } from "@/lib/geogrid";

export const dynamic = "force-dynamic";

function nextRun(freq: string): string {
  const d = new Date();
  d.setDate(d.getDate() + (freq === "monthly" ? 30 : 7));
  return d.toISOString();
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ schedules: [] });
  const location = new URL(request.url).searchParams.get("location");
  let q = supabase.from("ranking_schedules").select("*").eq("user_id", user.id);
  if (location) q = q.eq("location_name", location);
  const { data } = await q;
  return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const access = await getAccess(supabase, user.id, user.email);
  if (!access.entitlements.geoGrid) return NextResponse.json({ error: "recurso_de_agencia" }, { status: 403 });

  const b = (await request.json().catch(() => ({}))) as {
    location?: string; keyword?: string; grid?: number; spacingKm?: number; frequency?: string; enabled?: boolean;
  };
  if (!b.location || !b.keyword) return NextResponse.json({ error: "dados_incompletos" }, { status: 400 });
  let grid = Number(b.grid ?? 7);
  if (!(GRID_SIZES as readonly number[]).includes(grid)) return NextResponse.json({ error: "grade_invalida" }, { status: 400 });
  // Acompanhamento automático limitado a 7x7 para proteger o custo/créditos.
  if (grid > 7) grid = 7;
  const frequency = b.frequency === "monthly" ? "monthly" : "weekly";

  if (b.enabled === false) {
    await supabase.from("ranking_schedules").update({ enabled: false })
      .eq("user_id", user.id).eq("location_name", b.location).eq("keyword", b.keyword);
    return NextResponse.json({ ok: true, enabled: false });
  }

  const { error } = await supabase.from("ranking_schedules").upsert({
    user_id: user.id, location_name: b.location, keyword: b.keyword,
    grid_size: grid, spacing_km: Math.min(10, Math.max(0.25, Number(b.spacingKm ?? 1))),
    frequency, enabled: true, next_run_at: nextRun(frequency),
  }, { onConflict: "user_id,location_name,keyword" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, enabled: true, frequency });
}
