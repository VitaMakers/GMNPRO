"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Prospect {
  rank: number;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  claimed: boolean | null;
  placeId: string | null;
  mapsUrl: string | null;
}

type Saved = { term: string; city: string; items: Prospect[] };
const STORE = "gmn_prospeccao_ultima";

/** Monta o CSV (separador ";" e BOM, para abrir certo no Excel em português). */
function toCsv(items: Prospect[]): string {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Posição", "Empresa", "Categoria", "Telefone", "Endereço", "Site", "Nota", "Avaliações", "Perfil reivindicado", "Google Maps"];
  const rows = items.map((p) => [
    p.rank, p.name, p.category, p.phone, p.address, p.website,
    p.rating != null ? p.rating.toLocaleString("pt-BR") : "", p.reviews ?? "",
    p.claimed == null ? "" : p.claimed ? "Sim" : "Não", p.mapsUrl,
  ].map(esc).join(";"));
  return "﻿" + [head.map(esc).join(";"), ...rows].join("\r\n");
}

export default function ProspeccaoTool({ credits: initialCredits, cost }: { credits: number; cost: number }) {
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");
  const [credits, setCredits] = useState(initialCredits);
  const [items, setItems] = useState<Prospect[] | null>(null);
  const [searched, setSearched] = useState<{ term: string; city: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Filtros
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [site, setSite] = useState<"all" | "with" | "without">("all");
  const [unclaimedOnly, setUnclaimedOnly] = useState(false);

  // Recupera a última busca (para não pagar de novo ao voltar da Pré-análise).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const s = JSON.parse(raw) as Saved;
      if (Array.isArray(s.items)) { setItems(s.items); setSearched({ term: s.term, city: s.city }); setTerm(s.term); setCity(s.city); }
    } catch { /* ignora */ }
  }, []);

  const canSearch = term.trim().length >= 2 && city.trim().length >= 2 && !loading;

  async function search() {
    setConfirming(false);
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/prospeccao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, city }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof data.credits === "number") setCredits(data.credits);
        setError(data.detail || "Não foi possível buscar agora. Nenhum crédito foi cobrado.");
        return;
      }
      const list = (data.items ?? []) as Prospect[];
      setItems(list);
      setSearched({ term: term.trim(), city: city.trim() });
      if (typeof data.credits === "number") setCredits(data.credits);
      try { sessionStorage.setItem(STORE, JSON.stringify({ term: term.trim(), city: city.trim(), items: list } satisfies Saved)); } catch { /* ignora */ }
    } catch {
      setError("Falha de conexão. Nenhum crédito foi cobrado.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => (items ?? []).filter((p) => {
    if (minRating > 0 && (p.rating ?? 0) < minRating) return false;
    if (minReviews > 0 && (p.reviews ?? 0) < minReviews) return false;
    if (phoneOnly && !p.phone) return false;
    if (site === "with" && !p.website) return false;
    if (site === "without" && p.website) return false;
    if (unclaimedOnly && p.claimed !== false) return false;
    return true;
  }), [items, minRating, minReviews, phoneOnly, site, unclaimedOnly]);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = `${searched?.term ?? "empresas"}-${searched?.city ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.href = url;
    a.download = `prospeccao-${slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const input = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="space-y-5">
      {/* Busca */}
      <div className="rounded-3xl border border-border bg-white p-5 card-soft">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-xs font-medium text-muted">Segmento</span>
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ex.: imobiliária" className={`mt-1 ${input}`} onKeyDown={(e) => { if (e.key === "Enter" && canSearch) setConfirming(true); }} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Cidade</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex.: Taubaté" className={`mt-1 ${input}`} onKeyDown={(e) => { if (e.key === "Enter" && canSearch) setConfirming(true); }} />
          </label>
          <button onClick={() => setConfirming(true)} disabled={!canSearch || credits < cost} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            {loading ? "Buscando…" : `Buscar (${cost} créditos)`}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Saldo: <strong className="text-foreground">{credits}</strong> créditos. Cada busca traz até 100 empresas e usa {cost} créditos — cobrados só quando há resultado.
          {credits < cost && <span className="text-red-500"> Saldo insuficiente para buscar.</span>}
        </p>

        {confirming && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand/40 bg-brand/5 p-3 text-sm">
            <span>Buscar <strong>{term.trim()}</strong> em <strong>{city.trim()}</strong>? Serão usados {cost} créditos.</span>
            <button onClick={search} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Confirmar busca</button>
            <button onClick={() => setConfirming(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">Cancelar</button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {/* Resultado */}
      {items && (
        <div className="rounded-3xl border border-border bg-white p-5 card-soft">
          {items.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma empresa encontrada para <strong>{searched?.term}</strong> em <strong>{searched?.city}</strong>. Nenhum crédito foi cobrado. Tente outro termo ou confira o nome da cidade.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  {filtered.length} de {items.length} empresas · {searched?.term} em {searched?.city}
                </p>
                <button onClick={exportCsv} disabled={filtered.length === 0} className="rounded-lg bg-brand-2 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                  Exportar planilha ({filtered.length})
                </button>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-2/60 p-3 text-xs">
                <label className="flex items-center gap-1.5">Nota mínima
                  <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="rounded-md border border-border bg-white px-1.5 py-1">
                    <option value={0}>qualquer</option><option value={3}>3,0+</option><option value={4}>4,0+</option><option value={4.5}>4,5+</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">Avaliações
                  <select value={minReviews} onChange={(e) => setMinReviews(Number(e.target.value))} className="rounded-md border border-border bg-white px-1.5 py-1">
                    <option value={0}>qualquer</option><option value={10}>10+</option><option value={50}>50+</option><option value={100}>100+</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">Site
                  <select value={site} onChange={(e) => setSite(e.target.value as "all" | "with" | "without")} className="rounded-md border border-border bg-white px-1.5 py-1">
                    <option value="all">tanto faz</option><option value="with">com site</option><option value="without">sem site</option>
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={phoneOnly} onChange={(e) => setPhoneOnly(e.target.checked)} className="accent-brand-2" />Só com telefone</label>
                <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={unclaimedOnly} onChange={(e) => setUnclaimedOnly(e.target.checked)} className="accent-brand-2" />Só perfil não reivindicado</label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-3 font-medium">Empresa</th>
                      <th className="pb-2 pr-3 font-medium">Telefone</th>
                      <th className="pb-2 pr-3 font-medium">Endereço</th>
                      <th className="pb-2 pr-3 font-medium">Avaliações</th>
                      <th className="pb-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.placeId ?? `${p.rank}-${p.name}`} className="border-t border-border/60 align-top">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted">
                            {p.category ?? "—"}
                            {p.claimed === false && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">não reivindicado</span>}
                          </p>
                          {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="block max-w-[220px] truncate text-xs text-brand hover:underline">{p.website.replace(/^https?:\/\/(www\.)?/, "")}</a>}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3">{p.phone ?? <span className="text-muted">—</span>}</td>
                        <td className="max-w-[260px] py-2.5 pr-3 text-xs text-muted">{p.address ?? "—"}</td>
                        <td className="whitespace-nowrap py-2.5 pr-3">
                          {p.rating != null ? (<><span className="font-semibold">{p.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span> <span style={{ color: "#f5b400" }}>★</span> <span className="text-xs text-muted">({(p.reviews ?? 0).toLocaleString("pt-BR")})</span></>) : <span className="text-xs text-muted">sem avaliações</span>}
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-xs">
                          {p.placeId && <Link href={`/auditoria?placeId=${encodeURIComponent(p.placeId)}`} className="font-medium text-brand hover:underline">Analisar perfil</Link>}
                          {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="ml-3 text-muted hover:underline">Ver no Maps</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && <p className="mt-3 text-sm text-muted">Nenhuma empresa passa nos filtros escolhidos.</p>}
              <p className="mt-3 text-[11px] text-muted">Dados públicos da ficha no Google Maps. E-mail não aparece porque o Google Maps não mostra. &ldquo;Analisar perfil&rdquo; abre a Pré-análise dessa empresa e conta no seu limite mensal de pré-análises.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
