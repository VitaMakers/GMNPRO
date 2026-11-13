/**
 * Envio de e-mail via Resend (https://resend.com) — sem SDK, só fetch.
 * Variáveis (Vercel): RESEND_API_KEY e EMAIL_FROM (ex.: "GMN PRO <relatorios@seudominio.com.br>").
 */
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** Aceita "email@dominio", "Nome <email@dominio>" ou com aspas/espaços sobrando. */
function normalizeFrom(raw?: string): string {
  const v = (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!v) return "";
  const m = v.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/);
  if (m) {
    const name = m[1].trim().replace(/^["']+|["']+$/g, "").trim();
    return name ? `${name} <${m[2]}>` : m[2];
  }
  if (/^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(v)) return `GMN PRO <${v}>`;
  return "";
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  const from = normalizeFrom(process.env.EMAIL_FROM) || "GMN PRO <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, reply_to: opts.replyTo }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

type Branding = { name?: string | null; logo_url?: string | null; color?: string | null; phone?: string | null; site?: string | null } | null;
type Snap = { title: string; score: number; fraco: number; razoavel: number; bom: number; analyzed_at: string;
  items: { label: string; status: "bom" | "razoavel" | "fraco"; tip: string }[];
  ranking?: { keyword: string; avg_rank: number | null; top3_pct: number | null; top10_pct: number | null } | null };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** HTML do e-mail do relatório (resumo + link para o relatório completo). */
export function reportEmailHtml(snap: Snap, url: string, branding: Branding, note?: string): string {
  const brand = branding?.color || "#059669";
  const ring = snap.score >= 75 ? "#059669" : snap.score >= 50 ? "#d97706" : "#dc2626";
  const label = snap.score >= 75 ? "Bom" : snap.score >= 50 ? "Razoável" : "Fraco";
  const pend = snap.items.filter((i) => i.status !== "bom").sort((a) => (a.status === "fraco" ? -1 : 1)).slice(0, 5);
  const who = branding?.name ? esc(branding.name) : "GMN PRO";
  return `<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111827">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="padding:20px 24px;border-bottom:3px solid ${brand};display:flex;align-items:center;gap:12px">
    ${branding?.logo_url ? `<img src="${esc(branding.logo_url)}" alt="" style="height:40px;max-width:160px;object-fit:contain">` : `<div style="width:40px;height:40px;border-radius:10px;background:${brand};color:#fff;font-weight:700;font-size:18px;text-align:center;line-height:40px">${who.slice(0, 1)}</div>`}
    <div><div style="font-weight:700;font-size:16px">${who}</div><div style="font-size:12px;color:#6b7280">Relatório do Perfil Google</div></div>
  </div>
  <div style="padding:24px">
    <h1 style="margin:0 0 4px;font-size:20px">${esc(snap.title)}</h1>
    <p style="margin:0 0 16px;font-size:12px;color:#6b7280">Dados do Google de ${new Date(snap.analyzed_at).toLocaleDateString("pt-BR")}</p>
    ${note ? `<p style="margin:0 0 16px;font-size:14px;white-space:pre-line">${esc(note)}</p>` : ""}
    <div style="display:flex;gap:16px;align-items:center;margin:0 0 16px">
      <div style="width:84px;height:84px;border-radius:50%;background:${ring};color:#fff;font-size:32px;font-weight:800;text-align:center;line-height:84px">${snap.score}</div>
      <div><div style="font-weight:700;color:${ring}">${label}</div>
        <div style="font-size:13px;color:#374151;margin-top:4px"><b style="color:#dc2626">${snap.fraco}</b> fracos · <b style="color:#d97706">${snap.razoavel}</b> razoáveis · <b style="color:#059669">${snap.bom}</b> bons</div></div>
    </div>
    ${pend.length ? `<h3 style="margin:16px 0 8px;font-size:14px">O que fazer primeiro</h3><ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">${pend.map((p) => `<li><b>${esc(p.label)}</b><br><span style="color:#6b7280;font-size:12px">${esc(p.tip)}</span></li>`).join("")}</ol>` : `<p style="font-size:14px;color:#059669">Perfil 100% otimizado. Parabéns!</p>`}
    ${snap.ranking ? `<div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px"><div style="font-weight:700;font-size:14px;margin-bottom:6px">Posição no Google Maps — "${esc(snap.ranking.keyword)}"</div><div style="font-size:13px;color:#374151">Posição média <b>${snap.ranking.avg_rank ?? "—"}</b> · Top 3 <b style="color:#059669">${snap.ranking.top3_pct ?? 0}%</b> · Top 10 <b style="color:#d97706">${snap.ranking.top10_pct ?? 0}%</b></div></div>` : ""}
    <div style="text-align:center;margin:24px 0 8px"><a href="${url}" style="background:${brand};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">Ver relatório completo</a></div>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;font-size:11px;color:#9ca3af;text-align:center">${[branding?.phone, branding?.site].filter(Boolean).map((x) => esc(String(x))).join(" · ") || "Enviado pelo GMN PRO"}</div>
</div></body></html>`;
}
