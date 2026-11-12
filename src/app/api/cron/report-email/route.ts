import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { emailConfigured, sendEmail, reportEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const qs = new URL(request.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

/** Envio mensal automático: relatórios marcados como "mensal" e sem envio nos últimos 28 dias. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ ok: false, reason: "email_not_configured" });
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 28 * 86_400_000).toISOString();

  const { data: subs } = await admin
    .from("report_subscriptions")
    .select("user_id, location_name, email, last_sent_at")
    .eq("monthly", true)
    .or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`)
    .limit(100);

  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  let sent = 0, skipped = 0, failed = 0;
  for (const s of subs ?? []) {
    const [{ data: snap }, { data: branding }] = await Promise.all([
      admin.from("audit_snapshots").select("*").eq("user_id", s.user_id).eq("location_name", s.location_name).maybeSingle(),
      admin.from("agency_branding").select("name, logo_url, color, phone, site").eq("user_id", s.user_id).maybeSingle(),
    ]);
    if (!snap) { skipped++; continue; }
    try {
      const token = randomBytes(9).toString("base64url");
      await admin.from("shared_reports").insert({ token, user_id: s.user_id, location_name: s.location_name, snapshot: snap, branding: branding ?? null });
      await sendEmail({ to: s.email, subject: `Relatório mensal do perfil Google — ${snap.title}`, html: reportEmailHtml(snap, `${base}/relatorio/${token}`, branding ?? null) });
      await admin.from("report_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("user_id", s.user_id).eq("location_name", s.location_name);
      sent++;
    } catch { failed++; }
  }
  return NextResponse.json({ ok: true, sent, skipped, failed });
}
