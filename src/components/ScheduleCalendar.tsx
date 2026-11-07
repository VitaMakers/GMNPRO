"use client";

import { useMemo, useState } from "react";

export interface CalPost {
  id: string;
  scheduled_at: string;
  status: "draft" | "scheduled" | "published" | "failed";
  summary: string | null;
  kind?: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DOT: Record<CalPost["status"], string> = {
  published: "bg-brand-2",
  failed: "bg-red-400",
  scheduled: "bg-brand",
  draft: "bg-muted",
};

function key(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function ScheduleCalendar({ posts }: { posts: CalPost[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const byDay = useMemo(() => {
    const map = new Map<string, CalPost[]>();
    for (const p of posts) {
      const d = new Date(p.scheduled_at);
      const k = key(d.getFullYear(), d.getMonth(), d.getDate());
      const arr = map.get(k) ?? [];
      arr.push(p);
      map.set(k, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
    }
    return map;
  }, [posts]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendário</h2>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-lg border border-border px-2.5 py-1 text-sm text-muted transition hover:bg-surface-2">‹</button>
          <span className="min-w-36 text-center text-sm font-medium">{MONTHS[month]} {year}</span>
          <button onClick={next} className="rounded-lg border border-border px-2.5 py-1 text-sm text-muted transition hover:bg-surface-2">›</button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-16 rounded-lg" />;
          const k = key(year, month, day);
          const items = byDay.get(k) ?? [];
          const hasFailed = items.some((p) => p.status === "failed");
          const hasPublished = items.some((p) => p.status === "published");
          const tint = hasFailed
            ? "border-red-400/40 bg-red-400/5"
            : hasPublished
              ? "border-brand-2/40 bg-brand-2/5"
              : items.length
                ? "border-brand/40 bg-brand/5"
                : "border-border bg-surface-2";
          return (
            <div key={i} className={`min-h-16 rounded-lg border p-1 ${tint}`}>
              <div className={`mb-1 text-right text-xs ${k === todayKey ? "font-bold text-brand-2" : "text-muted"}`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-1" title={p.summary ?? ""}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[p.status]}`} />
                    <span className="truncate text-[10px] text-muted">
                      {new Date(p.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {p.kind === "photo" ? " 📷" : ""}
                    </span>
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted">+{items.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand" /> Agendada</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-2" /> Publicada</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Falhou</span>
      </div>
    </div>
  );
}
