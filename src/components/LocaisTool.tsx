"use client";

import { useState } from "react";
import { setActiveProfile } from "@/lib/profileStore";

type Snap = { score: number; fraco: number; razoavel: number; bom: number; analyzed_at: string } | null;
type Row = { location_name: string; title: string | null; photoUrl: string | null; snap: Snap };
type Branding = { name?: string | null; logo_url?: string | null; color?: string | null; phone?: string | null; site?: string | null };

export default function LocaisTool({ rows: initial, branding: initialBranding }: { rows: Row[]; branding: Branding | null }) {
  const [rows, setRows] = useState(initial);
  const [b, setB] = useState<Branding>(initialBranding ?? { color: "#059669" });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | "all" | "">("");
  const [link, setLink] = useState<{ loc: string; url: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [mail, setMail] = useState<{ loc: string; title: string } | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailNote, setMailNote] = useState("");
  const [mailMonthly, setMailMonthly] = useState(true);
  const [mailBusy, setMailBusy] = useState(false);

  async function sendMail() {
    if (!mail) return;
    setMailBusy(true);
    setMsg("");
    const res = await fetch("/api/report/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: mail.loc, to: mailTo.trim(), note: mailNote.trim(), monthly: mailMonthly }),
    });
    const d = await res.json();
    setMailBusy(false);
    if (!res.ok) { setMsg(d.detail ?? d.error ?? "Não foi possível enviar."); return; }
    setMsg(`E-mail enviado para ${mailTo.trim()}${mailMonthly ? " — e todo mês automaticamente." : "."}`);
    setMail(null);
    setMailTo("");
    setMailNote("");
  }

  async function saveBranding() {
    setSaving(true);
    const res = await fetch("/api/branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    setSaving(false);
    setMsg(res.ok ? "Marca salva." : "Não foi possível salvar.");
  }

  async function analyze(loc: string) {
    const res = await fetch(`/api/google/audit-profile?location=${encodeURIComponent(loc)}`);
    const d = await res.json();
    if (res.ok && d.snapshot) {
      setRows((rs) => rs.map((r) => (r.location_name === loc ? { ...r, snap: { score: d.snapshot.score, fraco: d.snapshot.fraco, razoavel: d.snapshot.razoavel, bom: d.snapshot.bom, analyzed_at: d.snapshot.analyzed_at } } : r)));
    }
  }
  async function analyzeOne(loc: string) { setRunning(loc); await analyze(loc); setRunning(""); }
  async function analyzeAll() {
    setRunning("all");
    for (const r of rows) await analyze(r.location_name);
    setRunning("");
  }
  async function share(loc: string) {
    setMsg("");
    const res = await fetch("/api/report/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: loc }) });
    const d = await res.json();
    if (!res.ok) { setMsg(d.detail ?? d.error ?? "Erro"); return; }
    setLink({ loc, url: d.url });
    try { await navigator.clipboard.writeText(d.url); setMsg("Link copiado!"); } catch { /* ignore */ }
  }

  const list = rows.filter((r) => (r.title ?? "").toLowerCase().includes(filter.toLowerCase()));
  const pend = rows.reduce((s, r) => s + (r.snap?.fraco ?? 0), 0);
  const analyzed = rows.filter((r) => r.snap).length;
  const avg = analyzed ? Math.round(rows.reduce((s, r) => s + (r.snap?.score ?? 0), 0) / analyzed) : 0;

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Perfis" value={String(rows.length)} />
        <Stat label="Analisados" value={`${analyzed}/${rows.length}`} />
        <Stat label="Nota média" value={analyzed ? String(avg) : "—"} color={avg >= 75 ? "#059669" : avg >= 50 ? "#d97706" : "#dc2626"} />
        <Stat label="Pendências críticas" value={String(pend)} color="#dc2626" />
      </div>

      {/* Marca da agência */}
      <details className="rounded-3xl border border-border bg-white p-5 card-soft">
        <summary className="cursor-pointer text-sm font-semibold">Marca da agência (relatórios white-label)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <In label="Nome da agência" v={b.name ?? ""} on={(v) => setB({ ...b, name: v })} />
          <In label="URL do logo (PNG/SVG)" v={b.logo_url ?? ""} on={(v) => setB({ ...b, logo_url: v })} />
          <In label="Telefone / WhatsApp" v={b.phone ?? ""} on={(v) => setB({ ...b, phone: v })} />
          <In label="Site" v={b.site ?? ""} on={(v) => setB({ ...b, site: v })} />
          <label className="block text-xs text-muted">Cor principal
            <input type="color" value={b.color ?? "#059669"} onChange={(e) => setB({ ...b, color: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border" />
          </label>
        </div>
        <button onClick={saveBranding} disabled={saving} className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Salvando…" : "Salvar marca"}</button>
      </details>

      {/* Lista */}
      <div className="rounded-3xl border border-border bg-white p-5 card-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar perfil…" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand" />
          <button onClick={analyzeAll} disabled={running !== ""} className="rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand-2 hover:bg-brand/10 disabled:opacity-60">
            {running === "all" ? "Analisando todos…" : "Analisar todos"}
          </button>
        </div>
        {msg && <p className="mb-2 text-xs text-brand-2">{msg}</p>}
        {link && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs">
            <span className="font-medium">Link do relatório:</span>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate text-brand-2 underline">{link.url}</a>
          </div>
        )}
        <ul className="divide-y divide-border/60">
          {list.map((r) => {
            const s = r.snap;
            const c = !s ? "#9ca3af" : s.score >= 75 ? "#059669" : s.score >= 50 ? "#d97706" : "#dc2626";
            return (
              <li key={r.location_name} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-xs font-bold">
                  {r.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (r.title ?? "?").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title ?? r.location_name}</p>
                  <p className="text-xs text-muted">{s ? `Analisado ${new Date(s.analyzed_at).toLocaleString("pt-BR")}` : "Ainda não analisado"}</p>
                </div>
                {s && (
                  <div className="flex items-center gap-2 text-xs">
                    <Dot n={s.fraco} c="#dc2626" /><Dot n={s.razoavel} c="#d97706" /><Dot n={s.bom} c="#059669" />
                  </div>
                )}
                <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white" style={{ background: c }}>{s ? s.score : "—"}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => analyzeOne(r.location_name)} disabled={running !== ""} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-60">
                    {running === r.location_name ? "…" : s ? "Atualizar" : "Analisar"}
                  </button>
                  <a href="/checklist" onClick={() => setActiveProfile(r.location_name)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2">Abrir</a>
                  {s && <button onClick={() => share(r.location_name)} className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-white">Relatório / Link</button>}
                  {s && <button onClick={() => setMail({ loc: r.location_name, title: r.title ?? "" })} className="rounded-lg border border-brand px-2.5 py-1.5 text-xs font-medium text-brand-2 hover:bg-brand/10">E-mail</button>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {mail && (
        <MailModal title={mail.title} to={mailTo} setTo={setMailTo} note={mailNote} setNote={setMailNote}
          monthly={mailMonthly} setMonthly={setMailMonthly} busy={mailBusy} onSend={sendMail} onClose={() => setMail(null)} />
      )}
    </div>
  );
}

function MailModal({ title, to, setTo, note, setNote, monthly, setMonthly, busy, onSend, onClose }: {
  title: string; to: string; setTo: (v: string) => void; note: string; setNote: (v: string) => void;
  monthly: boolean; setMonthly: (v: boolean) => void; busy: boolean; onSend: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold">Enviar relatório por e-mail</p>
        <p className="mt-0.5 text-xs text-muted">{title}</p>
        <label className="mt-4 block text-xs text-muted">E-mail do cliente
          <input value={to} onChange={(e) => setTo(e.target.value)} type="email" placeholder="cliente@empresa.com" className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
        </label>
        <label className="mt-3 block text-xs text-muted">Mensagem (opcional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Olá! Segue a análise do seu perfil no Google…" className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} className="h-4 w-4 accent-[#059669]" />
          Enviar automaticamente todo mês (com dados atualizados)
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={onSend} disabled={busy || !to.includes("@")} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Enviando…" : "Enviar"}</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 card-soft">
      <p className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
function Dot({ n, c }: { n: number; c: string }) {
  return <span className="grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] font-bold text-white" style={{ background: c }}>{n}</span>;
}
function In({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <label className="block text-xs text-muted">{label}
      <input value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
    </label>
  );
}
