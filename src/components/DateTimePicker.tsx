"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Conjunto de dias (YYYY-MM-DD) que já têm agendamento, para marcar no calendário. */
export function markedDaysFromPosts(posts: { scheduled_at: string }[]): Set<string> {
  const s = new Set<string>();
  for (const p of posts) {
    const d = new Date(p.scheduled_at);
    if (!isNaN(d.getTime())) s.add(dayKey(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return s;
}

export default function DateTimePicker({
  value,
  onChange,
  marked,
  className,
}: {
  value: string; // "YYYY-MM-DDTHH:mm" ou ""
  onChange: (v: string) => void;
  marked?: Set<string>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const now = new Date();

  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const sel = datePart ? new Date(`${datePart}T00:00:00`) : null;

  const [year, setYear] = useState(sel ? sel.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(sel ? sel.getMonth() : now.getMonth());

  useEffect(() => {
    if (!open) return;
    if (sel) {
      setYear(sel.getFullYear());
      setMonth(sel.getMonth());
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selKey = sel ? dayKey(sel.getFullYear(), sel.getMonth(), sel.getDate()) : "";

  const pickDay = (d: number) => onChange(`${dayKey(year, month, d)}T${timePart || "09:00"}`);
  const changeTime = (t: string) => onChange(`${datePart || todayKey}T${t}`);

  const label = value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "Escolher data e hora";

  const prev = () => (month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1));
  const next = () => (month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1));

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition focus:border-brand"
      >
        <span className={value ? "" : "text-muted"}>{label}</span>
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-72 rounded-xl border border-border bg-surface p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={prev} className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-2">‹</button>
            <span className="text-sm font-medium">{MONTHS[month]} {year}</span>
            <button type="button" onClick={next} className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-2">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
            {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const k = dayKey(year, month, d);
              const isSel = k === selKey;
              const isMarked = marked?.has(k);
              const isToday = k === todayKey;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  title={isMarked ? "Dia com agendamento" : undefined}
                  className={`grid h-8 place-items-center rounded-full text-xs transition ${
                    isSel
                      ? "bg-brand font-semibold text-white"
                      : isMarked
                        ? "border border-brand-2 text-brand-2"
                        : isToday
                          ? "border border-foreground/40"
                          : "hover:bg-surface-2"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted">Hora</span>
            <input
              type="time"
              value={timePart}
              onChange={(e) => changeTime(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">OK</button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-muted">
              <span className="h-3 w-3 rounded-full border border-brand-2" /> dia com agendamento
            </span>
            <button type="button" onClick={() => onChange("")} className="text-muted hover:underline">Limpar</button>
          </div>
        </div>
      )}
    </div>
  );
}
