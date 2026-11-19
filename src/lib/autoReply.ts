/**
 * Resposta automática de avaliações novas.
 * Roda a partir do cron: para cada perfil com auto-resposta ligada, pega as
 * avaliações novas (últimas 24h) ainda sem resposta, gera o texto com a IA
 * escolhida (tom, exemplos e chave do cliente) e publica no Google.
 * Negativas só entram se o dono tiver ligado "incluir negativas".
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getValidAccessToken } from "./google/token";
import { listReviewsFull, postReviewReply } from "./google/reviews";
import { generateReply, type Provider } from "./ai";
import { decryptSecret } from "./crypto";
import { blockedUserIds } from "./subscriptionAccess";

const THROTTLE_MS = 10 * 60 * 1000; // no máximo 1x a cada 10 min por perfil
const MAX_PROFILES = 25;            // perfis por execução
const MAX_PER_PROFILE = 15;         // avaliações por perfil por execução (o resto dreena na próxima)

interface SettingRow {
  user_id: string;
  location_name: string;
  business_name: string | null;
  keywords: string | null;
  tone: string | null;
  signature: string | null;
  provider: string | null;
  api_key: string | null;
  examples: { review: string; reply: string }[] | null;
  auto_reply_negatives: boolean | null;
  banned_words: string | null;
  auto_reply_last_run: string | null;
}

export async function runAutoReplies(
  admin: SupabaseClient,
): Promise<{ profiles: number; replied: number }> {
  const nowIso = new Date().toISOString();
  const cutoff = new Date(Date.now() - THROTTLE_MS).toISOString();

  const { data: list } = await admin
    .from("review_settings")
    .select(
      "user_id, location_name, business_name, keywords, tone, signature, provider, api_key, examples, auto_reply_negatives, banned_words, auto_reply_last_run",
    )
    .eq("auto_reply", true)
    .or(`auto_reply_last_run.is.null,auto_reply_last_run.lt.${cutoff}`)
    .limit(MAX_PROFILES);

  const settings = (list as SettingRow[]) ?? [];
  let replied = 0;

  // Trava: não responde avaliações de quem testou e não assinou (ou cancelou).
  const blocked = await blockedUserIds(admin, settings.map((s) => s.user_id));

  for (const s of settings) {
    if (blocked.has(s.user_id)) continue;
    // "Linha de corte": só respondemos avaliações criadas DEPOIS deste momento.
    // Assim, avaliações antigas (anteriores a ligar a resposta automática) nunca
    // são respondidas. Se o perfil ainda não tem linha de corte, estabelece agora
    // e não responde nada nesta rodada (evita responder o histórico).
    const boundary = s.auto_reply_last_run;
    if (!boundary) {
      await admin
        .from("review_settings")
        .update({ auto_reply_last_run: nowIso })
        .eq("user_id", s.user_id)
        .eq("location_name", s.location_name);
      continue;
    }
    const boundaryMs = new Date(boundary).getTime();

    try {
      const token = await getValidAccessToken(admin, s.user_id);
      const reviews = await listReviewsFull(token, s.location_name);

      // Apenas NOVAS (criadas após a linha de corte), ainda sem resposta e NÃO
      // negativas (negativas nunca são respondidas automaticamente).
      const novas = reviews
        .filter((r) => {
          if (r.replied || !r.createTime) return false;
          if (new Date(r.createTime).getTime() < boundaryMs) return false;
          const negativa = r.rating > 0 && r.rating <= 3;
          if (negativa && !s.auto_reply_negatives) return false;
          return true;
        })
        .sort((a, b) => new Date(a.createTime!).getTime() - new Date(b.createTime!).getTime());

      if (novas.length === 0) {
        // Nada novo: avança a linha de corte para agora (não reprocessa à toa).
        await admin
          .from("review_settings")
          .update({ auto_reply_last_run: nowIso })
          .eq("user_id", s.user_id)
          .eq("location_name", s.location_name);
        continue;
      }

      // Respostas recentes já publicadas, para a IA não repetir.
      const recentReplies = reviews
        .filter((r) => r.replied && r.replyComment)
        .slice(0, 6)
        .map((r) => r.replyComment as string);

      const { data: loc } = await admin
        .from("gmb_locations")
        .select("title")
        .eq("location_name", s.location_name)
        .maybeSingle();

      const clientKey = s.api_key ? decryptSecret(s.api_key) || undefined : undefined;

      let count = 0;
      let lastDoneMs: number | null = null;
      for (const r of novas) {
        if (count >= MAX_PER_PROFILE) break;
        try {
          const text = await generateReply(
            (s.provider ?? "groq") as Provider,
            {
              businessName: s.business_name || loc?.title || "nossa empresa",
              keywords: s.keywords ?? "",
              tone: s.tone ?? "",
              signature: s.signature ?? "",
              reviewerName: r.reviewer,
              rating: r.rating,
              reviewText: r.comment,
              examples: Array.isArray(s.examples) ? s.examples : [],
              bannedWords: s.banned_words ?? "",
              avoid: recentReplies,
            },
            clientKey,
          );
          await postReviewReply(token, r.name, text);
          replied++;
          count++;
          lastDoneMs = new Date(r.createTime!).getTime();
        } catch {
          /* pula esta avaliação (tenta de novo na próxima rodada) */
        }
      }

      // Avança a linha de corte. Se ainda há novas além do limite desta rodada,
      // avança só até a última respondida, para a próxima rodada continuar daí
      // sem pular nenhuma.
      const hitCap = count >= MAX_PER_PROFILE && novas.length > count;
      const nextBoundary = hitCap && lastDoneMs ? new Date(lastDoneMs + 1).toISOString() : nowIso;
      await admin
        .from("review_settings")
        .update({ auto_reply_last_run: nextBoundary })
        .eq("user_id", s.user_id)
        .eq("location_name", s.location_name);
    } catch {
      /* pula este perfil (não avança a linha de corte: tenta de novo depois) */
    }
  }

  return { profiles: settings.length, replied };
}
