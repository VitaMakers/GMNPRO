import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { runProfileAudit } from "@/lib/google/audit";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const qs = new URL(request.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

/** Atualização automática (noturna) dos snapshots: os 40 mais antigos por execução. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const { data: locs } = await admin
    .from("gmb_locations")
    .select("user_id, location_name, title")
    .limit(2000);
  const { data: snaps } = await admin.from("audit_snapshots").select("user_id, location_name, analyzed_at");
  const last = new Map((snaps ?? []).map((s) => [`${s.user_id}|${s.location_name}`, new Date(s.analyzed_at).getTime()]));

  const queue = (locs ?? [])
    .map((l) => ({ ...l, at: last.get(`${l.user_id}|${l.location_name}`) ?? 0 }))
    .sort((a, b) => a.at - b.at)
    .slice(0, 40);

  const tokens = new Map<string, string>();
  let ok = 0, fail = 0;
  for (const l of queue) {
    try {
      let token = tokens.get(l.user_id);
      if (!token) { token = await getValidAccessToken(admin, l.user_id); tokens.set(l.user_id, token); }
      const r = await runProfileAudit(token, l.location_name);
      const snap = buildSnapshot(r.auto, r.profile, l.title ?? "");
      await admin.from("audit_snapshots").upsert(
        { user_id: l.user_id, location_name: l.location_name, title: snap.title, score: snap.score, fraco: snap.fraco,
          razoavel: snap.razoavel, bom: snap.bom, items: snap.items, profile: snap.profile, analyzed_at: snap.analyzed_at },
        { onConflict: "user_id,location_name" },
      );
      ok++;
    } catch { fail++; }
  }
  return NextResponse.json({ ok: true, processed: queue.length, updated: ok, failed: fail });
}
