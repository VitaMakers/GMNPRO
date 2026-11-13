import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { dataForSeoConfigured } from "@/lib/dataforseo";
import { gridCredits } from "@/lib/geogrid";
import { executeRanking } from "@/lib/rankingRun";
import { entitlementsFor } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const qs = new URL(request.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

/** Roda as análises de ranking agendadas que já venceram (respeitando créditos). */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dataForSeoConfigured()) return NextResponse.json({ ok: false, reason: "dataforseo_off" });
  const admin = createAdminClient();

  const { data: due } = await admin
    .from("ranking_schedules")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", new Date().toISOString())
    .limit(20);

  let ran = 0, skipped = 0, failed = 0;
  const tokens = new Map<string, string>();
  for (const sch of due ?? []) {
    try {
      // Verifica plano + créditos direto na assinatura (sem getAccess).
      const { data: sub } = await admin.from("subscriptions").select("tier, credits, status, manual_access").eq("user_id", sch.user_id).maybeSingle();
      const tier = (sub?.tier as string) ?? "essencial";
      const ent = entitlementsFor(tier);
      const paid = sub?.status === "active" || sub?.manual_access === true;
      const need = gridCredits(sch.grid_size);
      if (!ent.geoGrid || !paid || (sub?.credits ?? 0) < need) { skipped++; 
        // adia 1 dia para não travar
        await admin.from("ranking_schedules").update({ next_run_at: new Date(Date.now() + 86400000).toISOString() }).eq("id", sch.id);
        continue;
      }
      let token = tokens.get(sch.user_id);
      if (!token) { token = await getValidAccessToken(admin, sch.user_id); tokens.set(sch.user_id, token); }
      await executeRanking(admin, sch.user_id, token, { location: sch.location_name, keyword: sch.keyword, grid: sch.grid_size, spacingKm: Number(sch.spacing_km) });
      await admin.from("subscriptions").update({ credits: (sub?.credits ?? 0) - need }).eq("user_id", sch.user_id);
      const next = new Date(); next.setDate(next.getDate() + (sch.frequency === "monthly" ? 30 : 7));
      await admin.from("ranking_schedules").update({ last_run_at: new Date().toISOString(), next_run_at: next.toISOString() }).eq("id", sch.id);
      ran++;
    } catch {
      failed++;
      await admin.from("ranking_schedules").update({ next_run_at: new Date(Date.now() + 86400000).toISOString() }).eq("id", sch.id);
    }
  }
  return NextResponse.json({ ok: true, ran, skipped, failed, due: due?.length ?? 0 });
}
