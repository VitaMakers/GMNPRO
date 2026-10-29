"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Topic = "STANDARD" | "EVENT" | "OFFER";
type Status = "draft" | "scheduled" | "published" | "failed";

interface Post {
  id: string;
  location_name: string;
  topic: Topic;
  summary: string;
  cta_type: string | null;
  cta_url: string | null;
  media_url: string | null;
  scheduled_at: string;
  status: Status;
  error: string | null;
}

const CTA_OPTIONS = [
  { value: "", label: "Sem botão" },
  { value: "LEARN_MORE", label: "Saiba mais" },
  { value: "BOOK", label: "Reservar" },
  { value: "ORDER", label: "Fazer pedido" },
  { value: "SHOP", label: "Comprar" },
  { value: "SIGN_UP", label: "Inscrever-se" },
  { value: "CALL", label: "Ligar" },
];

const TOPIC_LABEL: Record<Topic, string> = {
  STANDARD: "Novidade",
  OFFER: "Oferta",
  EVENT: "Evento",
};

const STATUS_LABEL: Record<Status, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted/15 text-muted" },
  scheduled: { label: "Agendada", cls: "bg-brand/15 text-brand" },
  published: { label: "Publicada", cls: "bg-brand-2/15 text-brand-2" },
  failed: { label: "Falhou", cls: "bg-red-400/15 text-red-400" },
};

export default function AgendamentoDashboard({
  userEmail,
  googleEmail,
}: {
  userEmail: string;
  googleEmail: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [profile, setProfile] = useState("");
  const [topic, setTopic] = useState<Topic>("STANDARD");
  const [summary, setSummary] = useState("");
  const [ctaType, setCtaType] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [when, setWhen] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [formError, setFormError] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_posts")
      .select("*")
      .order("scheduled_at", { ascending: true });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  async function savePost() {
    setFormError("");
    setFormMsg("");
    if (!profile.trim()) return setFormError("Informe o nome do perfil/empresa.");
    if (summary.trim().length < 10) return setFormError("Escreva um texto com pelo menos 10 caracteres.");
    if (!when) return setFormError("Escolha a data e a hora do agendamento.");

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      let mediaUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, file);
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from("scheduled_posts").insert({
        user_id: user.id,
        location_name: profile.trim(),
        topic,
        summary: summary.trim(),
        cta_type: ctaType || null,
        cta_url: ctaUrl.trim() || null,
        media_url: mediaUrl,
        scheduled_at: new Date(when).toISOString(),
        status: "scheduled",
      });
      if (error) throw error;

      setFormMsg("Postagem agendada! Ela será publicada no horário escolhido quando a conexão com o Google estiver ativa.");
      setSummary("");
      setCtaType("");
      setCtaUrl("");
      setWhen("");
      setFile(null);
      await loadPosts();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Não foi possível agendar.");
    } finally {
      setSaving(false);
    }
  }

  async function removePost(id: string) {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    await loadPosts();
  }

  return (
    <div className="space-y-6">
      {/* Conta + Google */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="text-muted">Conta: </span>
          <span className="font-medium">{userEmail}</span>
          <button onClick={logout} className="ml-3 text-xs text-muted hover:text-foreground hover:underline">
            Sair
          </button>
        </div>
        <div className="text-sm">
          {googleEmail ? (
            <span className="rounded-full bg-brand-2/15 px-3 py-1 text-xs font-medium text-brand-2">
              Google conectado: {googleEmail}
            </span>
          ) : (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              Google ainda não conectado
            </span>
          )}
        </div>
      </div>

      {!googleEmail && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-medium text-accent">Conexão com o Google em preparação</p>
          <p className="mt-1 text-muted">
            A API de postagens do Google está em análise de acesso (7-10 dias úteis).
            Enquanto isso, você já pode <strong>montar e agendar</strong> suas postagens
            aqui — assim que a conexão for liberada, elas começam a ser publicadas
            automaticamente no horário programado.
          </p>
        </div>
      )}

      {/* Compositor */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Nova postagem</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Perfil / empresa</span>
            <input
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="Ex.: Buffet Sorocaba"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Tipo</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as Topic)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="STANDARD">Novidade</option>
              <option value="OFFER">Oferta</option>
              <option value="EVENT">Evento</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-muted">Texto da postagem</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            maxLength={1500}
            placeholder="Escreva a novidade, oferta ou evento…"
            className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <span className="mt-1 block text-right text-xs text-muted">{summary.length}/1500</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Botão de ação</span>
            <select
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {CTA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {ctaType && ctaType !== "CALL" && (
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Link do botão</span>
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Imagem (opcional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Agendar para</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>

        <button
          onClick={savePost}
          disabled={saving}
          className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Agendando…" : "Agendar postagem"}
        </button>
        {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
        {formMsg && <p className="mt-3 text-sm text-brand-2">{formMsg}</p>}
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Suas postagens</h2>
        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma postagem ainda. Crie a primeira acima.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => {
              const st = STATUS_LABEL[p.status];
              return (
                <li key={p.id} className="flex gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  {p.media_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.media_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                      <span className="text-xs text-muted">{TOPIC_LABEL[p.topic]}</span>
                      <span className="text-xs text-muted">· {p.location_name}</span>
                      <span className="text-xs text-muted">
                        · {new Date(p.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{p.summary}</p>
                    {p.error && <p className="mt-1 text-xs text-red-400">{p.error}</p>}
                  </div>
                  {p.status !== "published" && (
                    <button
                      onClick={() => removePost(p.id)}
                      className="shrink-0 self-start text-xs text-red-400 hover:underline"
                    >
                      Excluir
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
