"use client";

import { useState } from "react";
import type { AuditReport, CheckResult } from "@/lib/audit";

interface Candidate {
  placeId: string;
  name: string;
  address: string;
}

export default function AuditTool() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);

  async function handleSearch() {
    setError("");
    setNotConfigured(false);
    setReport(null);
    setCandidates([]);
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?q=${encodeURIComponent(query)}`);
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Não foi possível buscar agora.");
        return;
      }
      if (!data.results?.length) {
        setError("Nenhuma empresa encontrada. Tente o nome com a cidade.");
        return;
      }
      setCandidates(data.results);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function runAudit(placeId: string) {
    setError("");
    setLoading(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/audit?placeId=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Não foi possível auditar agora.");
        return;
      }
      setReport(data.report);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!report && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <label className="mb-2 block text-sm font-medium">Nome da empresa</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex.: Clínica Sorriso Londrina"
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Analisar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Use o nome com a cidade se houver nomes parecidos.
          </p>
        </div>
      )}

      {notConfigured && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-medium text-accent">Chave da Google Places API não configurada.</p>
          <p className="mt-1 text-muted">
            Adicione a variável <code className="rounded bg-surface-2 px-1">GOOGLE_PLACES_API_KEY</code> no
            ambiente para ativar a auditoria com dados reais.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">Escolha o local certo:</p>
          {candidates.map((c) => (
            <button
              key={c.placeId}
              onClick={() => runAudit(c.placeId)}
              className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm transition hover:border-brand/50"
            >
              <span className="block font-medium">{c.name}</span>
              <span className="text-xs text-muted">{c.address}</span>
            </button>
          ))}
        </div>
      )}

      {report && <Report report={report} onReset={() => { setReport(null); setQuery(""); }} />}
    </div>
  );
}

function Report({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  const color =
    report.score >= 75 ? "text-brand-2" : report.score >= 50 ? "text-accent" : "text-red-400";
  const ring =
    report.score >= 75 ? "#34a853" : report.score >= 50 ? "#fbbc05" : "#f87171";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${ring} ${report.score * 3.6}deg, var(--surface-2) 0deg)` }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface">
            <span className={`text-2xl font-bold ${color}`}>{report.score}</span>
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-semibold">{report.place.name}</h2>
          {report.place.address && (
            <p className="text-sm text-muted">{report.place.address}</p>
          )}
          <p className="mt-2 text-sm">
            Nota de presença: <span className={`font-semibold ${color}`}>{report.score}/100</span>
          </p>
        </div>
      </div>

      {report.priorities.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-semibold">O que melhorar primeiro</h3>
          <ol className="space-y-2">
            {report.priorities.slice(0, 5).map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="font-semibold text-brand">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 font-semibold">Checklist completo</h3>
        <div className="space-y-2">
          {report.checks.map((c) => (
            <CheckRow key={c.key} c={c} />
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:bg-surface"
      >
        ← Analisar outra empresa
      </button>
    </div>
  );
}

function CheckRow({ c }: { c: CheckResult }) {
  const icon = c.status === "ok" ? "✓" : c.status === "warn" ? "!" : "✕";
  const cls =
    c.status === "ok" ? "bg-brand-2 text-white" : c.status === "warn" ? "bg-accent text-black" : "bg-red-400 text-white";
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${cls}`}>
        {icon}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{c.label}</span>
          <span className="text-xs text-muted">{c.points}/{c.maxPoints}</span>
        </div>
        <p className="text-xs text-muted">{c.detail}</p>
        {c.status !== "ok" && <p className="mt-1 text-xs text-brand">{c.tip}</p>}
      </div>
    </div>
  );
}
