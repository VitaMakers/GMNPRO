"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function loginWithGoogle() {
    setError("");
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/business.manage",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

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

  async function recover() {
    setError("");
    setMsg("");
    if (!email) {
      setError("Digite seu e-mail primeiro para recuperar o acesso.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/entrar`,
    });
    if (error) setError(error.message);
    else setMsg("Se este e-mail tiver conta, enviamos um link para redefinir a senha.");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#053d2f] via-[#059669] to-[#34d399]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_30%,rgba(255,255,255,0.15),transparent)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 lg:flex-row lg:gap-16">
        {/* Marca */}
        <div className="flex items-center gap-6 text-white">
          <h1 className="font-display text-6xl font-bold tracking-tight sm:text-7xl">
            GMN<span className="text-white/80">PRO</span>
          </h1>
          <span className="hidden h-20 w-px bg-white/30 lg:block" />
          <span className="hidden text-2xl font-light text-white/90 lg:block">
            {mode === "login" ? "entrar" : "criar conta"}
          </span>
        </div>

        {/* Formulário */}
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-2xl bg-white px-5 py-4 text-sm text-gray-900 shadow-lg outline-none placeholder:text-gray-400"
              />
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="senha"
                  className="w-full rounded-2xl bg-white px-5 py-4 pr-12 text-sm text-gray-900 shadow-lg outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label="Mostrar senha"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              aria-label="Entrar"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gray-900 text-2xl text-white shadow-xl ring-4 ring-white/20 transition hover:bg-black disabled:opacity-60"
            >
              {loading ? "…" : "→"}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between px-1 text-sm">
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-white/90 hover:text-white">
              {mode === "login" ? "Criar conta" : "Já tenho conta"}
            </button>
            <button onClick={recover} className="text-white/90 hover:text-white">
              Recuperar acesso
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-white/70">
            <span className="h-px flex-1 bg-white/30" />
            ou
            <span className="h-px flex-1 bg-white/30" />
          </div>

          <button
            onClick={loginWithGoogle}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-3.5 text-sm font-semibold text-gray-800 shadow-lg transition hover:bg-white disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.5-8 19.5-20 0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            {googleLoading ? "Abrindo Google…" : "Entrar com Google"}
          </button>

          {error && <p className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-sm text-white">{error}</p>}
          {msg && <p className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-sm text-white">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
