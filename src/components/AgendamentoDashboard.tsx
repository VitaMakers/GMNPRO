"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import DateTimePicker, { markedDaysFromPosts } from "@/components/DateTimePicker";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";
import GalleryVerifier from "@/components/GalleryVerifier";

type Topic = "STANDARD" | "EVENT" | "OFFER";
type Status = "draft" | "scheduled" | "published" | "failed";

interface Post {
  id: string;
  location_name: string;
  kind: string;
  topic: Topic;
  summary: string | null;
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
  scheduled: { label: "Agendada", cls: "bg-accent/15 text-accent" },
  published: { label: "Publicada", cls: "bg-brand-2/15 text-brand-2" },
  failed: { label: "Falhou", cls: "bg-red-400/15 text-red-400" },
};

const ERROR_LABELS: Record<string, string> = {
  oauth_nao_configurado: "A conexão com o Google não está configurada no servidor (variáveis OAuth).",
  sem_codigo: "O Google não retornou o código de autorização. Tente de novo.",
  estado_invalido: "Sessão de segurança expirou. Tente conectar de novo.",
  falha_na_troca: "Falha ao trocar o código por um token. Verifique o Client ID/Secret e a URL de redirecionamento.",
  access_denied: "Você cancelou ou negou a autorização no Google.",
};

export default function AgendamentoDashboard({
  userEmail,
  googleEmail,
  connected,
}: {
  userEmail: string;
  googleEmail: string | null;
  connected: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [flash, setFlash] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const detail = params.get("detalhe");
    const ok = params.get("conectado");
    if (err) {
      const base = ERROR_LABELS[err] ?? `Erro na conexão: ${err}`;
      setFlash({ type: "err", text: detail ? `${base} (Google: ${detail})` : base });
    } else if (ok) {
      setFlash({ type: "ok", text: "Google conectado com sucesso!" });
    }
    if (err || ok) {
      window.history.replaceState({}, "", "/agendamento");
    }
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const active = useActiveProfile();
  const [locations, setLocations] = useState<{ location_name: string; title: string | null }[]>([]);
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

  const [syncing, setSyncing] = useState(false);

  const loadLocations = useCallback(async () => {
    const { data } = await supabase
      .from("gmb_locations")
      .select("location_name, title")
      .order("title", { ascending: true });
    const locs = (data as { location_name: string; title: string | null }[]) ?? [];
    setLocations(locs);
    if (locs[0]) initActiveProfile(locs[0].location_name);
  }, [supabase]);

  const syncLocations = useCallback(async () => {
    setSyncing(true);
    setFlash(null);
    try {
      const res = await fetch("/api/google/sync-locations", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFlash({ type: "err", text: `Não foi possível buscar os locais: ${data.error ?? res.status}` });
      } else if (data.count === 0) {
        setFlash({ type: "err", text: "Conectado, mas nenhum local foi encontrado nesta conta. Confira se o perfil está nela." });
      } else {
        setFlash({ type: "ok", text: `${data.count} local(is) sincronizado(s)!` });
        await loadLocations();
      }
    } catch {
      setFlash({ type: "err", text: "Falha ao sincronizar. Tente de novo." });
    } finally {
      setSyncing(false);
    }
  }, [loadLocations]);

  useEffect(() => {
    loadPosts();
    loadLocations();
  }, [loadPosts, loadLocations]);

  // O form de nova postagem acompanha o perfil escolhido lá no topo.
  useEffect(() => {
    if (active) setProfile(active);
  }, [active]);

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

      const perfilNome = locations.find((l) => l.location_name === profile.trim())?.title ?? profile.trim();
      const quando = new Date(when).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      setFormMsg(`Postagem agendada para "${perfilNome}" em ${quando}. Será publicada automaticamente no horário.`);
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWhen, setEditWhen] = useState("");

  async function saveReschedule(id: string) {
    if (!editWhen) return;
    await supabase
      .from("scheduled_posts")
      .update({ scheduled_at: new Date(editWhen).toISOString() })
      .eq("id", id);
    setEditingId(null);
    await loadPosts();
  }

  const locationTitle = (name: string) =>
    locations.find((l) => l.location_name === name)?.title ?? name;

  // Mostra apenas os posts do perfil selecionado no topo.
  const shownPosts = active ? posts.filter((p) => p.location_name === active) : posts;
  const markedDays = markedDaysFromPosts(shownPosts);

  // Totais do perfil ativo (puxados do sistema).
  const nowD = new Date();
  const publishedThisMonth = shownPosts.filter((p) => {
    if (p.status !== "published") return false;
    const d = new Date(p.scheduled_at);
    return d.getMonth() === nowD.getMonth() && d.getFullYear() === nowD.getFullYear();
  }).length;
  const scheduledPosts = shownPosts.filter((p) => p.status === "scheduled");
  const scheduledCount = scheduledPosts.length;
  const upcomingScheduled = scheduledPosts.slice(0, 4); // só as 4 próximas na lista

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return (
    <div className="space-y-6">
      {flash && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            flash.type === "ok"
              ? "border-brand-2/40 bg-brand-2/10 text-brand-2"
              : "border-red-400/40 bg-red-400/10 text-red-400"
          }`}
        >
          {flash.text}
        </div>
      )}

      {/* Conta + Google */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-white card-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="text-muted">Conta: </span>
          <span className="font-medium">{userEmail}</span>
          <button onClick={logout} className="ml-3 text-xs text-muted hover:text-foreground hover:underline">
            Sair
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <>
              <span className="rounded-full bg-brand-2/15 px-3 py-1 text-xs font-medium text-brand-2">
                Google conectado{googleEmail ? `: ${googleEmail}` : ""}
              </span>
              <button
                onClick={syncLocations}
                disabled={syncing}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:bg-surface-2 disabled:opacity-50"
              >
                {syncing ? "Sincronizando…" : "Sincronizar locais"}
              </button>
            </>
          ) : (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              Google ainda não conectado
            </span>
          )}
        </div>
      </div>

      {!connected && (
        <div className="rounded-xl border border-brand/40 bg-brand/10 p-4 text-sm">
          <p className="font-medium">Conecte sua conta do Google</p>
          <p className="mt-1 text-muted">
            Autorize o acesso ao seu perfil para publicar as postagens automaticamente
            no horário agendado.
          </p>
          <a
            href="/api/google/connect"
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Conectar Google
          </a>
        </div>
      )}

      {/* Calendário (topo) — sempre visível */}
      <ScheduleCalendar posts={shownPosts} />

      {/* Compositor */}
      <div className="rounded-3xl border border-border bg-white card-soft p-5">
        <h2 className="mb-4 text-lg font-semibold">Nova postagem</h2>

        {/* Aviso em destaque do perfil escolhido — evita publicar no perfil errado */}
        {locations.length > 0 &&
          (profile ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm">
              <span aria-hidden>📍</span>
              <span className="text-muted">Agendando para:</span>
              <span className="font-semibold text-brand-2">
                {locations.find((l) => l.location_name === profile)?.title ?? profile}
              </span>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm text-accent">
              <span aria-hidden>⚠️</span> Escolha o perfil antes de agendar.
            </div>
          ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Perfil / empresa</span>
            {locations.length > 0 ? (
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {!profile && (
                  <option value="" disabled>
                    Selecione o perfil…
                  </option>
                )}
                {locations.map((l) => (
                  <option key={l.location_name} value={l.location_name}>
                    {l.title ?? l.location_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="Ex.: Buffet Sorocaba"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            )}
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
            <DateTimePicker value={when} onChange={setWhen} marked={markedDays} />
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
      <div className="rounded-3xl border border-border bg-white card-soft p-5">
        <h2 className="mb-4 text-lg font-semibold">Suas postagens</h2>

        {/* Totais do perfil */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-white">
            <div>
              <p className="text-sm font-medium text-white/90">Agendadas</p>
              <p className="font-display text-3xl font-extrabold leading-tight">{scheduledCount}</p>
            </div>
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-brand to-brand-2 p-4 text-white">
            <div>
              <p className="text-sm font-medium text-white/90">Publicadas no mês</p>
              <p className="font-display text-3xl font-extrabold leading-tight">{publishedThisMonth}</p>
            </div>
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.3 2.3 4.7-4.7" /></svg>
          </div>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-muted">
          Próximas agendadas{scheduledCount > 4 ? ` (mostrando 4 de ${scheduledCount})` : ""}
        </h3>
        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : upcomingScheduled.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma postagem agendada para este perfil. Crie a primeira acima.</p>
        ) : (
          <ul className="space-y-3">
            {upcomingScheduled.map((p) => {
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
                      <span className="text-xs text-muted">{p.kind === "photo" ? "Foto" : TOPIC_LABEL[p.topic]}</span>
                      <span className="rounded bg-background px-1.5 py-0.5 text-xs font-medium text-foreground">
                        {locationTitle(p.location_name)}
                      </span>
                      <span className="text-xs text-muted">
                        · {new Date(p.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{p.summary}</p>
                    {p.error && <p className="mt-1 text-xs text-red-400">{p.error}</p>}
                    {editingId === p.id && (
                      <div className="mt-2 flex gap-2">
                        <DateTimePicker
                          value={editWhen}
                          onChange={setEditWhen}
                          marked={markedDays}
                          className="flex-1"
                        />
                        <button onClick={() => saveReschedule(p.id)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
                        <button onClick={() => setEditingId(null)} className="text-sm text-muted hover:underline">Cancelar</button>
                      </div>
                    )}
                  </div>
                  {p.status === "scheduled" && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        onClick={() => { setEditingId(p.id); setEditWhen(toLocalInput(p.scheduled_at)); }}
                        className="text-xs text-brand-2 hover:underline"
                      >
                        Editar horário
                      </button>
                      <button
                        onClick={() => removePost(p.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                  {p.status === "failed" && (
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

      {connected && locations.length > 0 && <GalleryVerifier locations={locations} />}
    </div>
  );
}
