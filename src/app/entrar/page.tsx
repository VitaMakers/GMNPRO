"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("signup") !== null || p.get("mode") === "signup") {
      setMode("signup");
    }
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { phone: phone.trim() } },
        });
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Brilho verde suave (tema claro) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(closest-side, rgba(16,185,129,0.22), transparent)" }}
        />
        <div
          className="absolute left-10 top-44 h-96 w-96 rounded-full blur-[120px]"
          style={{ background: "radial-gradient(closest-side, rgba(52,211,153,0.16), transparent)" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8">
        {/* Esquerda — marca */}
        <div className="flex flex-1 items-center pb-6 pt-16 lg:py-16">
          <div>
            <span className="font-serif text-2xl text-brand-2">Grupo Vita</span>
            <h1 className="mt-3 whitespace-nowrap font-display text-6xl font-extrabold leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
              GMN PRO
            </h1>
            <p className="mt-6 max-w-sm text-muted">
              Otimize, agende e cresça no seu Google Meu Negócio. Entre para começar.
            </p>
          </div>
        </div>

        {/* Direita — card */}
        <div className="mx-auto w-full max-w-sm pb-12 lg:mx-0 lg:w-[400px] lg:max-w-none lg:flex-none lg:pb-0">
          <div className="w-full rounded-3xl border border-border bg-surface p-8 shadow-xl shadow-slate-200/70">
            {/* E-mail */}
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="mt-2.5 w-full border-0 border-b border-border bg-transparent pb-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand"
              />
            </label>

            {mode === "signup" && (
              <label className="mt-7 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  WhatsApp (com DDD)
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex.: 15 99663-4333"
                  className="mt-2.5 w-full border-0 border-b border-border bg-transparent pb-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand"
                />
              </label>
            )}

            {/* Senha */}
            <label className="mt-7 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••"
                className="mt-2.5 w-full border-0 border-b border-border bg-transparent pb-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand"
              />
            </label>

            <div className="mt-3 text-right">
              <button type="button" onClick={recover} className="text-xs text-muted transition hover:text-foreground">
                Esqueceu a senha?
              </button>
            </div>

            {/* Entrar */}
            <button
              onClick={submit}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            {/* ou */}
            <div className="my-6 flex items-center gap-4 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Google */}
            <button
              onClick={loginWithGoogle}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground transition hover:bg-surface-2 disabled:opacity-60"
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

            {/* Alternar */}
            <p className="mt-7 text-center text-xs leading-relaxed text-muted">
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <button
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMsg(""); }}
                className="font-medium text-brand-2 hover:underline"
              >
                {mode === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
