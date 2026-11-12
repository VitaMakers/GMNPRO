"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIERS = [
  { v: "essencial", label: "Essencial" },
  { v: "agencia2", label: "Agência 2" },
  { v: "agencia4", label: "Agência 4" },
];

export default function AdminTierSelect({ userId, tier }: { userId: string; tier: string }) {
  const router = useRouter();
  const [value, setValue] = useState(tier);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: next }),
      });
      if (!res.ok) setValue(prev);
      else router.refresh();
    } catch {
      setValue(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      disabled={saving}
      className="rounded-lg border border-border bg-white px-2 py-1 text-xs outline-none focus:border-brand disabled:opacity-60"
      title="Plano do usuário"
    >
      {TIERS.map((t) => (
        <option key={t.v} value={t.v}>{t.label}</option>
      ))}
    </select>
  );
}
