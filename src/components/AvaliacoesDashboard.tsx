"use client";

import { useCallback, useEffect, useState } from "react";

type LocationOption = { location_name: string; title: string | null };
type AiProvider = "claude" | "openai" | "gemini" | "groq";
type Example = { review: string; reply: string };

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
  provider: AiProvider;
  apiKey: string;
  autoReply: boolean;
  autoReplyNegatives: boolean;
}

type RowState = {
  draft: string;
  generating: boolean;
  sending: boolean;
  sent: boolean;
  error: string;
};

const EMPTY_SETTINGS: Settings = {
  keywords: "",
  tone: "",
  signature: "",
  provider: "groq",
  apiKey: "",
  autoReply: false,
  autoReplyNegatives: false,
};
const EMPTY_EXAMPLES: Example[] = [
  { review: "", reply: "" },
  { review: "", reply: "" },
  { review: "", reply: "" },
];

export default function AvaliacoesDashboard({ locations }: { locations: LocationOption[] }) {
  const [selected, setSelected] = useState(locations[0]?.location_name ?? "");
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [examples, setExamples] = useState<Example[]>(EMPTY_EXAMPLES);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const loadSettings = useCallback(async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/review-settings?location=${encodeURIComponent(selected)}`);
      const data = await res.json();
      const s = data.settings ?? {};
      setSettings({
        keywords: s.keywords ?? "",
        tone: s.tone ?? "",
        signature: s.signature ?? "",
        provider: (s.provider as AiProvider) ?? "groq",
        apiKey: "",
        autoReply: !!s.autoReply,
        autoReplyNegatives: !!s.autoReplyNegatives,
      });
      setHasApiKey(!!s.hasApiKey);
      const ex: Example[] = Array.isArray(s.examples) ? s.examples : [];
      setExamples([0, 1, 2].map((i) => ({ review: ex[i]?.review ?? "", reply: ex[i]?.reply ?? "" })));
    } catch {
      /* ignora */
    }
  }, [selected]);

  useEffect(() => {
    loadSettings();
    setReviews(null);
    setRows({});
  }, [loadSettings]);

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/review-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selected,
          keywords: settings.keywords,
          tone: settings.tone,
          signature: settings.signature,
          provider: settings.provider,
          apiKey: settings.apiKey, // em branco = mantém a chave atual
          examples,
          autoReply: settings.autoReply,
          autoReplyNegatives: settings.autoReplyNegatives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar.");
      setSettingsMsg("Configurações salvas!");
      if (settings.apiKey.trim()) {
        setHasApiKey(true);
        setSettings((s) => ({ ...s, apiKey: "" }));
      }
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

  function setExample(i: number, patch: Partial<Example>) {
    setExamples((ex) => ex.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
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
              placeholder="Ex.: espetinho em Sorocaba, churrasco, petiscaria"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <span className="mt-1 block text-xs text-muted">
              Servem para a IA citar o negócio com naturalidade — ela nunca vai dizer que a pessoa
              elogiou algo que não escreveu.
            </span>
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
              placeholder="Ex.: Equipe Espetinho do Vale"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">IA usada</span>
            <select
              value={settings.provider}
              onChange={(e) => setSettings((s) => ({ ...s, provider: e.target.value as AiProvider }))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="groq">Groq / Llama — grátis (recomendado)</option>
              <option value="gemini">Gemini (Google) — grátis</option>
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">ChatGPT (OpenAI)</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-muted">Minha própria chave de IA (opcional)</span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder={
                hasApiKey
                  ? "Chave salva ✓ — deixe em branco para manter, ou cole uma nova"
                  : "Cole sua chave do provedor acima — ou deixe em branco"
              }
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <span className="mt-1 block text-xs text-muted">
              Guardada de forma criptografada. Em branco = usa a IA gratuita do sistema. Chaves
              grátis: Groq em console.groq.com/keys, Gemini em aistudio.google.com/apikey.
            </span>
          </label>
        </div>

        {/* Exemplos de tom do cliente */}
        <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium">Ensinar o tom do cliente (opcional)</p>
          <p className="mt-1 text-xs text-muted">
            Cole até 3 avaliações já respondidas pelo cliente. A IA aprende o jeito de falar dele e
            responde no mesmo estilo.
          </p>
          <div className="mt-3 space-y-3">
            {examples.map((ex, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <textarea
                  value={ex.review}
                  onChange={(e) => setExample(i, { review: e.target.value })}
                  rows={2}
                  placeholder={`Exemplo ${i + 1} — a avaliação`}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <textarea
                  value={ex.reply}
                  onChange={(e) => setExample(i, { reply: e.target.value })}
                  rows={2}
                  placeholder={`Exemplo ${i + 1} — a resposta que o cliente deu`}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Resposta automática */}
        <div className="mt-5 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.autoReply}
              onChange={(e) => setSettings((s) => ({ ...s, autoReply: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-sm font-medium">Responder avaliações novas automaticamente</span>
              <span className="mt-0.5 block text-xs text-muted">
                O sistema responde sozinho as avaliações novas (recebidas nas últimas 24h), com a IA
                e o tom configurados — normalmente em até 1 hora após chegarem.
              </span>
            </span>
          </label>

          {settings.autoReply && (
            <label className="mt-3 flex cursor-pointer items-start gap-3 border-t border-brand/20 pt-3">
              <input
                type="checkbox"
                checked={settings.autoReplyNegatives}
                onChange={(e) => setSettings((s) => ({ ...s, autoReplyNegatives: e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                <span className="block text-sm font-medium">Incluir avaliações negativas (1–3 estrelas)</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Desligado (recomendado): negativas ficam para você responder à mão. Ligado: a IA
                  também responde as negativas automaticamente.
                </span>
              </span>
            </label>
          )}
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
