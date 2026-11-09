"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LocationOption = { location_name: string; title: string | null };

interface Review {
  name: string;
  reviewer: string;
  rating: number;
  comment: string;
  createTime: string;
  replied: boolean;
  replyComment: string | null;
}

interface Settings {
  keywords: string;
  tone: string;
  signature: string;
  provider: "claude" | "openai";
}

type RowState = {
  draft: string;
  generating: boolean;
  sending: boolean;
  sent: boolean;
  error: string;
};

const EMPTY_SETTINGS: Settings = { keywords: "", tone: "", signature: "", provider: "claude" };

export default function AvaliacoesDashboard({ locations }: { locations: LocationOption[] }) {
  const supabase = createClient();
  const [selected, setSelected] = useState(locations[0]?.location_name ?? "");
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const loadSettings = useCallback(async () => {
    if (!selected) return;
    const { data } = await supabase
      .from("review_settings")
      .select("keywords, tone, signature, provider")
      .eq("location_name", selected)
      .maybeSingle();
    setSettings({
      keywords: data?.keywords ?? "",
      tone: data?.tone ?? "",
      signature: data?.signature ?? "",
      provider: (data?.provider as "claude" | "openai") ?? "claude",
    });
  }, [selected, supabase]);

  useEffect(() => {
    loadSettings();
    setReviews(null);
    setRows({});
  }, [loadSettings]);

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("review_settings").upsert(
        {
          user_id: user.id,
          location_name: selected,
          keywords: settings.keywords.trim() || null,
          tone: settings.tone.trim() || null,
          signature: settings.signature.trim() || null,
          provider: settings.provider,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,location_name" },
      );
      if (error) throw error;
      setSettingsMsg("Configurações salvas!");
    } catch (e) {
      setSettingsMsg(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function loadReviews() {
    setLoadingReviews(true);
    setReviewsError("");
    setRows({});
    try {
      const res = await fetch(`/api/google/reviews?location=${encodeURIComponent(selected)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar avaliações.");
      setReviews(data.reviews as Review[]);
    } catch (e) {
      setReviewsError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoadingReviews(false);
    }
  }

  function patchRow(name: string, patch: Partial<RowState>) {
    setRows((r) => {
      const prev: RowState = r[name] ?? {
        draft: "",
        generating: false,
        sending: false,
        sent: false,
        error: "",
      };
      return { ...r, [name]: { ...prev, ...patch } };
    });
  }

  async function generate(review: Review) {
    patchRow(review.name, { generating: true, error: "" });
    try {
      const res = await fetch("/api/ai/review-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selected,
          reviewer: review.reviewer,
          rating: review.rating,
          comment: review.comment,
          provider: settings.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao gerar.");
      patchRow(review.name, { draft: data.reply, generating: false });
    } catch (e) {
      patchRow(review.name, { generating: false, error: e instanceof Error ? e.message : "Erro ao gerar." });
    }
  }

  async function send(review: Review) {
    const row = rows[review.name];
    if (!row?.draft.trim()) return;
    patchRow(review.name, { sending: true, error: "" });
    try {
      const res = await fetch("/api/google/review-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewName: review.name, comment: row.draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao enviar.");
      patchRow(review.name, { sending: false, sent: true });
    } catch (e) {
      patchRow(review.name, { sending: false, error: e instanceof Error ? e.message : "Erro ao enviar." });
    }
  }

  const pending = reviews?.filter((r) => !r.replied) ?? [];
  const answered = reviews?.filter((r) => r.replied) ?? [];

  return (
    <div className="space-y-6">
      {/* Configurações */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Como a IA deve responder</h2>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {locations.map((l) => (
              <option key={l.location_name} value={l.location_name}>
                {l.title ?? l.location_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-muted">Palavras-chave do negócio (separadas por vírgula)</span>
            <input
              value={settings.keywords}
              onChange={(e) => setSettings((s) => ({ ...s, keywords: e.target.value }))}
              placeholder="Ex.: buffet de casamento em Sorocaba, salão de festas, decoração"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-muted">Tom / estilo (como você quer responder)</span>
            <textarea
              value={settings.tone}
              onChange={(e) => setSettings((s) => ({ ...s, tone: e.target.value }))}
              rows={2}
              placeholder="Ex.: caloroso e próximo, tratar por você, agradecer sempre, oferecer contato em negativas"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Assinatura</span>
            <input
              value={settings.signature}
              onChange={(e) => setSettings((s) => ({ ...s, signature: e.target.value }))}
              placeholder="Ex.: Equipe Buffet Vita"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">IA usada</span>
            <select
              value={settings.provider}
              onChange={(e) => setSettings((s) => ({ ...s, provider: e.target.value as "claude" | "openai" }))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">ChatGPT (OpenAI)</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-60"
          >
            {savingSettings ? "Salvando…" : "Salvar configurações"}
          </button>
          <button
            onClick={loadReviews}
            disabled={loadingReviews}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loadingReviews ? "Carregando…" : "Carregar avaliações"}
          </button>
          {settingsMsg && <span className="text-xs text-brand-2">{settingsMsg}</span>}
        </div>
      </div>

      {reviewsError && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-400">{reviewsError}</div>
      )}

      {reviews && pending.length === 0 && answered.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          Nenhuma avaliação encontrada para este perfil.
        </div>
      )}

      {/* A responder */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold">A responder ({pending.length})</h2>
          {pending.map((r) => (
            <ReviewCard
              key={r.name}
              review={r}
              row={rows[r.name]}
              onGenerate={() => generate(r)}
              onSend={() => send(r)}
              onDraftChange={(v) => patchRow(r.name, { draft: v })}
            />
          ))}
        </div>
      )}

      {/* Já respondidas */}
      {answered.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-muted">Já respondidas ({answered.length})</h2>
          {answered.map((r) => (
            <div key={r.name} className="rounded-2xl border border-border bg-surface p-5 opacity-80">
              <ReviewHeader review={r} />
              <div className="mt-3 rounded-lg border border-brand-2/30 bg-brand-2/5 p-3 text-sm">
                <span className="text-xs font-medium text-brand-2">Sua resposta:</span>
                <p className="mt-1 text-muted">{r.replyComment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-accent" aria-label={`${rating} estrelas`}>
      {"★".repeat(rating)}
      <span className="text-border">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function ReviewHeader({ review }: { review: Review }) {
  const negativa = review.rating > 0 && review.rating <= 3;
  const date = review.createTime ? new Date(review.createTime).toLocaleDateString("pt-BR") : "";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{review.reviewer}</span>
        <Stars rating={review.rating} />
        {date && <span className="text-xs text-muted">· {date}</span>}
        {negativa && (
          <span className="rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
            Negativa — revise antes de enviar
          </span>
        )}
      </div>
      {review.comment && <p className="mt-2 text-sm text-muted">{review.comment}</p>}
    </div>
  );
}

function ReviewCard({
  review,
  row,
  onGenerate,
  onSend,
  onDraftChange,
}: {
  review: Review;
  row?: RowState;
  onGenerate: () => void;
  onSend: () => void;
  onDraftChange: (v: string) => void;
}) {
  const r = row ?? { draft: "", generating: false, sending: false, sent: false, error: "" };
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <ReviewHeader review={review} />

      {r.sent ? (
        <div className="mt-3 rounded-lg border border-brand-2/40 bg-brand-2/10 p-3 text-sm text-brand-2">
          ✓ Resposta publicada no Google.
        </div>
      ) : (
        <div className="mt-4">
          {!r.draft && (
            <button
              onClick={onGenerate}
              disabled={r.generating}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {r.generating ? "Gerando…" : "Gerar resposta com IA"}
            </button>
          )}

          {r.draft && (
            <div className="space-y-3">
              <textarea
                value={r.draft}
                onChange={(e) => onDraftChange(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onSend}
                  disabled={r.sending}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {r.sending ? "Enviando…" : "Enviar resposta"}
                </button>
                <button
                  onClick={onGenerate}
                  disabled={r.generating}
                  className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2 disabled:opacity-60"
                >
                  {r.generating ? "Gerando…" : "Gerar outra"}
                </button>
              </div>
            </div>
          )}

          {r.error && <p className="mt-2 text-sm text-red-400">{r.error}</p>}
        </div>
      )}
    </div>
  );
}
