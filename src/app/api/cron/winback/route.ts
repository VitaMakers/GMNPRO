import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/stripe";
import { GRACE_DAYS } from "@/lib/access";
import { isAccountActive, type SubLike } from "@/lib/subscriptionAccess";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendWhatsapp, whatsappConfigured } from "@/lib/whatsapp";
import { winbackEmailHtml, winbackWhatsappText, WINBACK_EMAIL_SUBJECT } from "@/lib/winbackMessages";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 50;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

interface SubRow extends SubLike {
  user_id: string;
  winback_sent_at?: string | null;
}

/**
 * Reengajamento de quem TESTOU e NÃO ASSINOU.
 * Envia e-mail (Resend) e, se um provedor estiver configurado, WhatsApp — uma
 * única vez por conta. Só contempla contas cujo teste já expirou e que ainda
 * estão dentro da janela antes da exclusão automática.
 * Proteções: admin, acesso manual e assinantes ativos/em teste são ignorados.
 * ?dry=1 apenas simula (não envia, não marca).
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  const assinarUrl = `${base}/assinar`;
  const now = Date.now();

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, status, manual_access, trial_ends_at, winback_sent_at");
  const subMap = new Map<string, SubRow>(
    ((subs as SubRow[] | null) ?? []).map((s) => [s.user_id, s]),
  );

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersData?.users ?? [];

  let eligible = 0;
  const sent: { email: string | null; channels: string[] }[] = [];

  for (const u of users) {
    if (u.email && ADMIN_EMAILS.includes(u.email.toLowerCase())) continue;
    const s = subMap.get(u.id);
    if (!s) continue; // sem registro de assinatura → ignora
    if (isAccountActive(s)) continue; // ativo / em teste / manual → ignora
    const trialEnds = s.trial_ends_at ? new Date(s.trial_ends_at).getTime() : null;
    if (!trialEnds || trialEnds > now) continue; // ainda em teste ou sem base
    if (trialEnds + GRACE_DAYS * DAY <= now) continue; // passou da janela (vira exclusão)
    if (s.winback_sent_at) continue; // já contatado

    eligible++;
    if (dryRun || sent.length >= BATCH_LIMIT) continue;

    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const first = String(meta.name ?? meta.full_name ?? "").trim().split(/\s+/)[0] || undefined;
    const phone = String(meta.phone ?? meta.whatsapp ?? "");
    const channels: string[] = [];

    if (u.email && emailConfigured()) {
      try {
        await sendEmail({ to: u.email, subject: WINBACK_EMAIL_SUBJECT, html: winbackEmailHtml(first, assinarUrl) });
        channels.push("email");
      } catch { /* não derruba o lote */ }
    }
    if (phone && whatsappConfigured()) {
      try {
        const r = await sendWhatsapp({ to: phone, text: winbackWhatsappText(first, assinarUrl) });
        if (r.sent) channels.push("whatsapp");
      } catch { /* não derruba o lote */ }
    }

    // Só marca como contatado se ALGUM canal realmente enviou — assim, se o
    // e-mail/WhatsApp ainda não estiver configurado, a pessoa será contatada
    // numa próxima execução depois que você ligar o canal.
    if (channels.length > 0) {
      await admin.from("subscriptions").update({ winback_sent_at: new Date().toISOString() }).eq("user_id", u.id);
      sent.push({ email: u.email ?? null, channels });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    eligible,
    sent: sent.length,
    emailConfigured: emailConfigured(),
    whatsappConfigured: whatsappConfigured(),
    detail: sent,
  });
}
