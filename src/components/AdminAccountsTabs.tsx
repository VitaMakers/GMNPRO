"use client";

import { useState } from "react";
import AdminGrantButton from "@/components/AdminGrantButton";
import AdminTierSelect from "@/components/AdminTierSelect";
import AdminFoundingButton from "@/components/AdminFoundingButton";
import AdminAffiliateButton from "@/components/AdminAffiliateButton";
import AdminDeleteButton from "@/components/AdminDeleteButton";

export interface AccountRow {
  userId: string;
  email: string;
  phone: string;
  created: string;
  categoria: string;
  plano: string | null;
  valor: number;
  manual: boolean;
  tier: string;
  deletionInDays: number | null;
  isAdmin: boolean;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
const corCategoria = (c: string) =>
  c.startsWith("Assinante")
    ? "text-brand-2"
    : c.startsWith("Liberado")
      ? "text-sky-500"
      : c.startsWith("Em teste") || c.startsWith("Assinou")
        ? "text-accent"
        : "text-red-500";

type TabKey = "ativos" | "teste" | "expirados";

export default function AdminAccountsTabs({
  ativos,
  teste,
  expirados,
}: {
  ativos: AccountRow[];
  teste: AccountRow[];
  expirados: AccountRow[];
}) {
  const [tab, setTab] = useState<TabKey>("ativos");

  const tabs: { key: TabKey; label: string; rows: AccountRow[]; activeClass: string }[] = [
    { key: "ativos", label: "Clientes ativos", rows: ativos, activeClass: "bg-brand-2 text-white" },
    { key: "teste", label: "Clientes em teste", rows: teste, activeClass: "bg-accent text-white" },
    { key: "expirados", label: "Testes expirados", rows: expirados, activeClass: "bg-red-500 text-white" },
  ];
  const current = tabs.find((t) => t.key === tab) ?? tabs[0];

  return (
    <>
      {/* 3 botões lado a lado */}
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? t.activeClass : "border border-border bg-white text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20" : "bg-surface-2 text-muted"}`}>
                {t.rows.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabela do grupo selecionado */}
      <div className="overflow-x-auto rounded-3xl border border-border bg-white card-soft">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Contato (WhatsApp)</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Valor/mês</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {current.rows.map((r, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">
                  {r.phone ? (
                    <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-brand-2 hover:underline">
                      {r.phone}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className={`px-4 py-3 font-medium ${corCategoria(r.categoria)}`}>
                  {r.categoria}
                  {r.deletionInDays !== null && (
                    <span className="mt-0.5 block text-[11px] font-normal text-red-500">
                      exclui em {r.deletionInDays} dia{r.deletionInDays === 1 ? "" : "s"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{r.plano ?? "—"}</td>
                <td className="px-4 py-3">{r.valor ? brl(r.valor) : "—"}</td>
                <td className="px-4 py-3 text-muted">{dt(r.created)}</td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[240px] max-w-[300px] flex-wrap items-center gap-1.5">
                    {!r.isAdmin && <AdminTierSelect userId={r.userId} tier={r.tier} />}
                    {!r.isAdmin && <AdminFoundingButton userId={r.userId} />}
                    {!r.isAdmin && <AdminAffiliateButton userId={r.userId} email={r.email} />}
                    <AdminGrantButton userId={r.userId} granted={r.manual} />
                    {!r.isAdmin && <AdminDeleteButton userId={r.userId} email={r.email} />}
                  </div>
                </td>
              </tr>
            ))}
            {current.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">Nenhuma conta aqui.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
