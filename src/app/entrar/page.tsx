"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setMsg("");
    if (!email || password.length < 6) {
      setError("Informe um e-mail e uma senha de pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Conta criada! Se pedir confirmação por e-mail, confirme e volte para entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/agendamento");
        router.refresh();
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            G
          </span>
          <span>
            GMN <span className="text-brand">PRO</span>
          </span>
        </Link>

        <h1 className="text-center text-lg font-semibold">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-center text-xs text-muted">
          Para agendar e publicar postagens no seu Google Meu Negócio.
        </p>

        <div className="mt-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Senha (mín. 6 caracteres)"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {msg && <p className="mt-3 text-sm text-brand-2">{msg}</p>}

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setMsg("");
          }}
          className="mt-5 w-full text-center text-xs text-muted hover:text-foreground"
        >
          {mode === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
