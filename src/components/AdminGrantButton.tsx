"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGrantButton({ userId, granted }: { userId: string; granted: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, grant: !granted }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
        granted
          ? "border-red-400/40 text-red-400 hover:bg-red-400/10"
          : "border-brand/40 text-brand-2 hover:bg-brand/10"
      }`}
    >
      {loading ? "…" : granted ? "Remover grátis" : "Liberar grátis"}
    </button>
  );
}
