"use client";

import { useEffect, useState } from "react";
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

export default function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
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

  if (profiles.length === 0) return null;

  const shown = profiles.slice(0, 6);
  const extra = profiles.length - shown.length;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {shown.map((p) => {
        const on = active === p.location_name;
        return (
          <button
            key={p.location_name}
            onClick={() => setActiveProfile(p.location_name)}
            title={p.title ?? p.location_name}
            className={`group flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition ${
              on
                ? "border-brand bg-brand/10"
                : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
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
            <span
              className={`max-w-[120px] truncate text-xs font-medium ${
                on ? "text-brand-2" : "text-muted group-hover:text-foreground"
              }`}
            >
              {p.title ?? "Perfil"}
            </span>
            {on && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
          </button>
        );
      })}
      {extra > 0 && (
        <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted">
          +{extra}
        </span>
      )}
    </div>
  );
}
