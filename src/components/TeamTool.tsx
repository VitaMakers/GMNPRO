"use client";

import { useEffect, useState } from "react";

type Member = { member_email: string; member_id: string | null; role: string; created_at: string };

export default function TeamTool() {
  const [members, setMembers] = useState<Member[]>([]);
  const [used, setUsed] = useState(1);
  const [seats, setSeats] = useState(1);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);

  async function load() {
    const res = await fetch("/api/team");
    const d = await res.json();
    if (res.ok) { setMembers(d.members ?? []); setUsed(d.used ?? 1); setSeats(d.seats ?? 1); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ t: "err", m: d.detail ?? d.error ?? "Erro" }); return; }
    setEmail(""); setMsg({ t: "ok", m: "Usuário convidado. Ele entra com esse e-mail e já acessa seus perfis." });
    load();
  }
  async function remove(e: string) {
    await fetch("/api/team", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) });
    load();
  }
  async function buySeat() {
    setBusy(true);
    const res = await fetch("/api/team/seat", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (d.url) window.location.href = d.url; else setMsg({ t: "err", m: d.error ?? "Erro ao iniciar compra." });
  }

  const full = used >= seats;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 card-soft">
        <p className="text-sm"><strong>{used}</strong> de <strong>{seats}</strong> usuários em uso.</p>
        <button onClick={buySeat} disabled={busy} className="rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand-2 transition hover:bg-brand/10 disabled:opacity-60">
          Comprar usuário extra (R$ 48,50/mês)
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 card-soft">
        <p className="text-sm font-semibold">Convidar usuário</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@daequipe.com"
            className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand" />
          <button onClick={add} disabled={busy || full || !email.includes("@")} title={full ? "Sem assentos — compre um usuário extra" : ""}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {busy ? "…" : "Convidar"}
          </button>
        </div>
        {full && <p className="mt-2 text-xs text-amber-700">Você atingiu o limite de usuários do plano. Compre um usuário extra para adicionar mais.</p>}
        {msg && <p className={`mt-2 text-xs ${msg.t === "ok" ? "text-brand-2" : "text-red-500"}`}>{msg.m}</p>}
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 card-soft">
        <p className="mb-3 text-sm font-semibold">Usuários</p>
        <ul className="divide-y divide-border/60">
          <li className="flex items-center justify-between py-2.5 text-sm">
            <span><strong>Você</strong> <span className="text-muted">(dono)</span></span>
            <span className="text-xs text-muted">administrador</span>
          </li>
          {members.map((m) => (
            <li key={m.member_email} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="truncate">{m.member_email}</span>
                <span className="ml-2 text-xs text-muted">{m.member_id ? "ativo" : "convite pendente"}</span>
              </span>
              <button onClick={() => remove(m.member_email)} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">Remover</button>
            </li>
          ))}
          {members.length === 0 && <li className="py-3 text-sm text-muted">Nenhum usuário convidado ainda.</li>}
        </ul>
      </div>
    </div>
  );
}
