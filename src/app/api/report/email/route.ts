import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { emailConfigured, sendEmail, reportEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Envia o relatório do perfil por e-mail ao cliente (e salva o envio mensal, se marcado). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ error: "not_configured", detail: "RESEND_API_KEY não configurada no Vercel." }, { status: 503 });

  const b = (await request.json().catch(() => ({}))) as { location?: string; to?: string; note?: string; monthly?: boolean };
  const to = (b.to ?? "").trim();
  if (!b.location || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ error: "dados_invalidos" }, { status: 400 });

  const [{ data: snap }, { data: branding }, { data: rk }] = await Promise.all([
    supabase.from("audit_snapshots").select("*").eq("user_id", user.id).eq("location_name", b.location).maybeSingle(),
    supabase.from("agency_branding").select("name, logo_url, color, phone, site").eq("user_id", user.id).maybeSingle(),
    supabase.from("ranking_runs").select("keyword, grid_size, avg_rank, top3_pct, top10_pct, created_at")
      .eq("user_id", user.id).eq("location_name", b.location).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!snap) return NextResponse.json({ error: "sem_analise", detail: "Analise o perfil primeiro." }, { status: 404 });
  const snapshot = { ...snap, ranking: rk ?? null };

  const token = randomBytes(9).toString("base64url");
  await supabase.from("shared_reports").insert({ token, user_id: user.id, location_name: b.location, snapshot, branding: branding ?? null });
  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  const url = `${base}/relatorio/${token}`;

  try {
    await sendEmail({
      to,
      subject: `Relatório do perfil Google — ${snap.title}`,
      html: reportEmailHtml({ ...snap, ranking: rk ?? null }, url, branding ?? null, b.note),
      replyTo: user.email ?? undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: "envio", detail: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }

  // Assinatura mensal (best-effort).
  try {
    await supabase.from("report_subscriptions").upsert(
      { user_id: user.id, location_name: b.location, email: to, monthly: !!b.monthly, last_sent_at: new Date().toISOString() },
      { onConflict: "user_id,location_name" },
    );
  } catch { /* tabela ausente */ }

  return NextResponse.json({ ok: true, url });
}
