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

const DAY_MS = 24 * 60 * 60 * 1000;
const THROTTLE_MS = 60 * 60 * 1000; // no máximo 1x por hora por perfil
const MAX_PROFILES = 5; // por execução, para caber no tempo do cron
const MAX_PER_PROFILE = 5;

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
}

export async function runAutoReplies(
  admin: SupabaseClient,
): Promise<{ profiles: number; replied: number }> {
  const nowIso = new Date().toISOString();
  const cutoff = new Date(Date.now() - THROTTLE_MS).toISOString();

  const { data: list } = await admin
    .from("review_settings")
    .select(
      "user_id, location_name, business_name, keywords, tone, signature, provider, api_key, examples, auto_reply_negatives, banned_words",
    )
    .eq("auto_reply", true)
    .or(`auto_reply_last_run.is.null,auto_reply_last_run.lt.${cutoff}`)
    .limit(MAX_PROFILES);

  const settings = (list as SettingRow[]) ?? [];
  let replied = 0;

  for (const s of settings) {
    // Marca o horário já, para não reprocessar o mesmo perfil nesta hora.
    await admin
      .from("review_settings")
      .update({ auto_reply_last_run: nowIso })
      .eq("user_id", s.user_id)
      .eq("location_name", s.location_name);

    try {
      const token = await getValidAccessToken(admin, s.user_id);
      const reviews = await listReviewsFull(token, s.location_name);
      const now = Date.now();
      const novas = reviews.filter(
        (r) => !r.replied && r.createTime && now - new Date(r.createTime).getTime() <= DAY_MS,
      );
      if (novas.length === 0) continue;

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

      let clientKey: string | undefined;
      if (s.api_key) {
        try {
          clientKey = decryptSecret(s.api_key);
        } catch {
          clientKey = undefined;
        }
      }

      let count = 0;
      for (const r of novas) {
        if (count >= MAX_PER_PROFILE) break;
        const negativa = r.rating > 0 && r.rating <= 3;
        if (negativa && !s.auto_reply_negatives) continue;
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
        } catch {
          /* pula esta avaliação */
        }
      }
    } catch {
      /* pula este perfil */
    }
  }

  return { profiles: settings.length, replied };
}
