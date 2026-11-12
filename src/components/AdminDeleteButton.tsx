"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDeleteButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    const ok = window.confirm(
      `Excluir a conta de ${email || "este usuário"}?\n\nIsso apaga a conta e TODOS os dados dela (perfis, posts, configurações). O contato (email/WhatsApp) fica salvo na lista de contas excluídas. Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(`Não foi possível excluir: ${d.error ?? res.status}`);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      className="rounded-lg border border-red-400/40 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-400/10 disabled:opacity-60"
    >
      {loading ? "…" : "Excluir"}
    </button>
  );
}
