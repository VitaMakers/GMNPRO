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

const STATUS_META: Record<CalPost["status"], { dot: string; label: string }> = {
  scheduled: { dot: "bg-accent", label: "Agendada" },
  published: { dot: "bg-brand-2", label: "Publicada" },
  failed: { dot: "bg-red-400", label: "Falhou" },
  draft: { dot: "bg-muted", label: "Rascunho" },
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

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };
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
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="rounded-lg border border-border px-3 py-1 text-xs text-muted transition hover:bg-surface-2"
          >
            Hoje
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-2">‹</button>
          <button onClick={next} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-2">›</button>
        </div>
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["scheduled", "published", "failed"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>

      {/* Dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-28 rounded-xl" />;
          const k = key(year, month, day);
          const items = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          return (
            <div
              key={i}
              className={`min-h-28 rounded-xl border bg-surface-2 p-1.5 transition ${
                isToday ? "border-foreground/40 ring-1 ring-foreground/20" : "border-border"
              }`}
            >
              <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-foreground" : "text-muted"}`}>
                {day}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1 rounded-md bg-background/60 px-1.5 py-0.5"
                    title={p.summary ?? ""}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[p.status].dot}`} />
                    <span className="truncate text-[11px] text-foreground">
                      {new Date(p.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {p.kind === "photo" ? " 📷" : " 📝"}{" "}
                      {p.summary ?? ""}
                    </span>
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="px-1 text-[11px] text-muted">+{items.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
