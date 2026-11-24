"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Profile,
  useActiveProfile,
  setActiveProfile,
  initActiveProfile,
} from "@/lib/profileStore";

function initials(title: string | null, fallback: string) {
  const base = (title ?? fallback).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Avatar({ p, on }: { p: Profile; on: boolean }) {
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-bold ring-2 ${
        on ? "ring-brand" : "ring-transparent"
      } ${p.photoUrl ? "" : "bg-brand/15 text-brand-2"}`}
    >
      {p.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(p.title, p.location_name)
      )}
    </span>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export default function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const active = useActiveProfile();

  useEffect(() => {
    let ok = true;
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d: { profiles?: Profile[] }) => {
        if (!ok) return;
        const list = d.profiles ?? [];
        setProfiles(list);
        if (list[0]) initActiveProfile(list[0].location_name);
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((p) => (p.title ?? p.location_name).toLowerCase().includes(term));
  }, [profiles, q]);

  if (profiles.length === 0) return null;

  function pick(name: string) {
    setActiveProfile(name);
    setOpen(false);
    setQ("");
  }

  return (
    <div className="relative flex min-w-0 items-center gap-1.5">
      {/* Lupa / buscar empresa — abre a lista completa com busca por nome */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Buscar empresa por nome"
        aria-expanded={open}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
          open ? "border-brand bg-brand/10 text-brand-2" : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
        }`}
      >
        <SearchIcon />
        <span className="hidden sm:inline">Buscar</span>
        <span className="rounded-full bg-brand/15 px-1.5 text-[10px] font-bold text-brand-2">{profiles.length}</span>
      </button>

      {/* Strip rolável com TODAS as empresas (antes só mostrava 6) */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {profiles.map((p) => {
          const on = active === p.location_name;
          return (
            <button
              key={p.location_name}
              onClick={() => setActiveProfile(p.location_name)}
              title={p.title ?? p.location_name}
              className={`group flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition ${
                on ? "border-brand bg-brand/10" : "border-border bg-surface hover:bg-surface-2"
              }`}
            >
              <Avatar p={p} on={on} />
              <span className={`max-w-[120px] truncate text-xs font-medium ${on ? "text-brand-2" : "text-muted group-hover:text-foreground"}`}>
                {p.title ?? "Perfil"}
              </span>
              {on && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>

      {/* Dropdown de busca / lista completa */}
      {open && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
            tabIndex={-1}
          />
          <div className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[85vw] rounded-2xl border border-border bg-white p-2 shadow-xl">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-muted">
              <SearchIcon />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar empresa por nome…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
              {q && (
                <button onClick={() => setQ("")} className="shrink-0 text-xs text-muted hover:text-foreground" title="Limpar">
                  ✕
                </button>
              )}
            </div>

            <p className="px-1 pb-1 pt-2 text-[11px] text-muted">
              {filtered.length} de {profiles.length} empresa{profiles.length === 1 ? "" : "s"}
            </p>

            <ul className="max-h-72 overflow-y-auto">
              {filtered.map((p) => {
                const on = active === p.location_name;
                return (
                  <li key={p.location_name}>
                    <button
                      onClick={() => pick(p.location_name)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
                        on ? "bg-brand/10" : "hover:bg-surface-2"
                      }`}
                    >
                      <Avatar p={p} on={on} />
                      <span className={`min-w-0 flex-1 truncate text-sm font-medium ${on ? "text-brand-2" : "text-foreground"}`}>
                        {p.title ?? p.location_name}
                      </span>
                      {on && <span className="shrink-0 text-[11px] font-semibold text-brand-2">ativo</span>}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-2 py-4 text-center text-xs text-muted">Nenhuma empresa com esse nome.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
