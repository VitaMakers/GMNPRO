import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { runProfileAudit } from "@/lib/google/audit";
import { buildSnapshot } from "@/lib/snapshot";
import { emailConfigured, sendEmail } from "@/lib/email";

const esc = (v: string) => v.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c));

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
  const { data: snaps } = await admin.from("audit_snapshots").select("user_id, location_name, analyzed_at, score, profile");
  const last = new Map((snaps ?? []).map((s) => [`${s.user_id}|${s.location_name}`, new Date(s.analyzed_at).getTime()]));
  const prevSnap = new Map((snaps ?? []).map((s) => [`${s.user_id}|${s.location_name}`, s]));
  const canAlert = emailConfigured();
  const emailCache = new Map<string, string | null>();
  async function ownerEmail(uid: string): Promise<string | null> {
    if (emailCache.has(uid)) return emailCache.get(uid)!;
    const { data } = await admin.auth.admin.getUserById(uid);
    const e = data?.user?.email ?? null;
    emailCache.set(uid, e);
    return e;
  }

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
      try {
        await admin.from("score_history").insert({
          user_id: l.user_id, location_name: l.location_name, score: snap.score,
          fraco: snap.fraco, razoavel: snap.razoavel, bom: snap.bom, analyzed_at: snap.analyzed_at,
        });
      } catch { /* ignora */ }

      // Alertas: nota caiu >=10 ou perfil ficou fechado.
      if (canAlert) {
        const prev = prevSnap.get(`${l.user_id}|${l.location_name}`) as { score?: number; profile?: { open?: boolean } } | undefined;
        const prevScore = prev?.score;
        const wasOpen = prev?.profile?.open !== false;
        const nowClosed = snap.profile?.open === false;
        const dropped = typeof prevScore === "number" && snap.score <= prevScore - 10;
        if ((dropped || (wasOpen && nowClosed))) {
          const to = await ownerEmail(l.user_id);
          if (to) {
            const motivo = nowClosed
              ? "O perfil aparece como <b>Fechado permanentemente</b> no Google."
              : `A nota caiu de <b>${prevScore}</b> para <b>${snap.score}</b>.`;
            try {
              await sendEmail({
                to,
                subject: `⚠️ Alerta: ${snap.title}`,
                html: `<div style="font-family:system-ui;max-width:520px;margin:0 auto"><h2 style="font-size:18px">Alerta no perfil</h2><p style="font-size:14px"><b>${esc(snap.title)}</b></p><p style="font-size:14px">${motivo}</p><p style="font-size:13px;color:#6b7280">Abra o GMN PRO para ver os detalhes e corrigir.</p></div>`,
              });
            } catch { /* ignora envio */ }
          }
        }
      }
      ok++;
    } catch { fail++; }
  }
  return NextResponse.json({ ok: true, processed: queue.length, updated: ok, failed: fail });
}
