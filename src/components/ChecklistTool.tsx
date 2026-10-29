"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHECKLIST,
  priorities,
  scoreFrom,
  type ChecklistItem,
} from "@/lib/checklist";

const STORAGE_KEY = "gmnpro.checklist";

export default function ChecklistTool() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* ignora */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      /* ignora */
    }
  }, [checked, loaded]);

  const score = useMemo(() => scoreFrom(checked), [checked]);
  const top = useMemo(() => priorities(checked).slice(0, 5), [checked]);
  const totalItems = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const reset = () => setChecked({});

  const color = score >= 75 ? "text-brand-2" : score >= 50 ? "text-accent" : "text-red-400";
  const ring = score >= 75 ? "#34a853" : score >= 50 ? "#fbbc05" : "#f87171";

  return (
    <div className="space-y-6">
      {/* Nota */}
      <div className="sticky top-16 z-20 flex items-center gap-4 rounded-2xl border border-border bg-surface/95 p-4 backdrop-blur">
        <div
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${ring} ${score * 3.6}deg, var(--surface-2) 0deg)` }}
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-surface">
            <span className={`text-xl font-bold ${color}`}>{score}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Sua nota de otimização</p>
          <p className="text-xs text-muted">
            {doneItems} de {totalItems} itens concluídos
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:bg-surface-2"
        >
          Limpar
        </button>
      </div>

      {/* Prioridades */}
      {top.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">O que fazer primeiro</h2>
          <ol className="space-y-2">
            {top.map((item, i) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <span className="font-semibold text-brand">{i + 1}.</span>
                <span>
                  <span className="font-medium">{item.label}</span>
                  <span className="block text-xs text-muted">{item.tip}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {top.length === 0 && (
        <div className="rounded-2xl border border-brand-2/40 bg-brand-2/10 p-5 text-sm font-medium text-brand-2">
          Parabéns! Seu perfil está 100% otimizado segundo este checklist. Mantenha a
          constância de postagens e avaliações.
        </div>
      )}

      {/* Categorias */}
      {CHECKLIST.map((cat) => {
        const catDone = cat.items.filter((i) => checked[i.id]).length;
        return (
          <div key={cat.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{cat.title}</h3>
              <span className="text-xs text-muted">
                {catDone}/{cat.items.length}
              </span>
            </div>
            <ul className="space-y-2">
              {cat.items.map((item) => (
                <Row key={item.id} item={item} checked={!!checked[item.id]} onToggle={() => toggle(item.id)} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Row({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        onClick={onToggle}
        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
          checked ? "border-brand-2/40 bg-brand-2/10" : "border-border bg-surface-2 hover:border-brand/40"
        }`}
      >
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
            checked ? "border-brand-2 bg-brand-2 text-white" : "border-border"
          }`}
        >
          {checked ? "✓" : ""}
        </span>
        <span>
          <span className={`block text-sm ${checked ? "text-foreground" : "font-medium"}`}>
            {item.label}
          </span>
          {!checked && <span className="mt-0.5 block text-xs text-muted">{item.tip}</span>}
        </span>
      </button>
    </li>
  );
}
