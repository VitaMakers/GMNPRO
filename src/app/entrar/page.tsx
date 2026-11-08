"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const err = p.get("error");
    if (err) {
      const d = p.get("d");
      const label = err === "login_google" ? "Não foi possível concluir o login com o Google." : `Erro no login: ${err}`;
      setError(d ? `${label} (${decodeURIComponent(d)})` : label);
      window.history.replaceState({}, "", "/entrar");
    }
  }, []);

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
    <div className="relative grid min-h-screen overflow-hidden bg-background lg:grid-cols-2">
      {/* Aurora verde */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-2/30 blur-[120px]" />
      <div className="pointer-events-none absolute left-20 top-40 h-96 w-96 rounded-full bg-brand/30 blur-[120px]" />

      {/* Lado esquerdo — marca */}
      <div className="relative z-10 flex flex-col justify-center px-8 py-16 sm:px-16">
        <span className="font-serif text-2xl text-white/85">Grupo Vita</span>
        <h1 className="mt-2 font-display text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">
          GMN<span className="block text-brand-2">PRO</span>
        </h1>
        <p className="mt-6 max-w-sm text-muted">
          Otimize, agende e cresça no seu Google Meu Negócio. Entre para começar.
        </p>
      </div>

      {/* Lado direito — formulário */}
      <div className="relative z-10 flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface/80 p-7 shadow-2xl backdrop-blur">
          <h2 className="font-display text-xl font-semibold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h2>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Senha</span>
                <button type="button" onClick={recover} className="text-xs text-brand-2 hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 pr-11 text-sm outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Mostrar senha"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </label>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={loginWithGoogle}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold transition hover:bg-surface disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.5-8 19.5-20 0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            {googleLoading ? "Abrindo Google…" : "Continuar com Google"}
          </button>

          {error && <p className="mt-4 rounded-lg border border-red-400/40 bg-red-400/10 p-2.5 text-sm text-red-400">{error}</p>}
          {msg && <p className="mt-4 rounded-lg border border-brand-2/40 bg-brand-2/10 p-2.5 text-sm text-brand-2">{msg}</p>}

          <p className="mt-6 text-center text-sm text-muted">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMsg(""); }} className="font-medium text-brand-2 hover:underline">
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
