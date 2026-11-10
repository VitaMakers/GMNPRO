import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { createLocalPost, createMediaItem } from "@/lib/google/business";
import { runAutoReplies } from "@/lib/autoReply";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DuePost {
  id: string;
  user_id: string;
  location_name: string;
  kind: string;
  topic: "STANDARD" | "EVENT" | "OFFER";
  summary: string | null;
  cta_type: string | null;
  cta_url: string | null;
  media_url: string | null;
  event_title: string | null;
  event_start: string | null;
  event_end: string | null;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const qs = url.searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("scheduled_posts")
    .select(
      "id,user_id,location_name,kind,topic,summary,cta_type,cta_url,media_url,event_title,event_start,event_end",
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (due as DuePost[]) ?? [];
  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of posts) {
    try {
      const accessToken = await getValidAccessToken(admin, post.user_id);
      let created: { name: string };

      if (post.kind === "photo") {
        if (!post.media_url) throw new Error("Foto sem imagem.");
        created = await createMediaItem(accessToken, post.location_name, post.media_url);
      } else {
        created = await createLocalPost(accessToken, post.location_name, {
          summary: post.summary ?? "",
          topicType: post.topic,
          mediaUrl: post.media_url,
          ctaType: post.cta_type,
          ctaUrl: post.cta_url,
          eventTitle: post.event_title,
          eventStart: post.event_start,
          eventEnd: post.event_end,
        });
      }

      await admin
        .from("scheduled_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          google_post_name: created.name ?? null,
          error: null,
        })
        .eq("id", post.id);

      results.push({ id: post.id, status: "published" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "erro desconhecido";
      await admin
        .from("scheduled_posts")
        .update({ status: "failed", error: message.slice(0, 500) })
        .eq("id", post.id);
      results.push({ id: post.id, status: "failed", error: message });
    }
  }

  // Resposta automática de avaliações novas (não derruba a publicação se falhar).
  let autoReply: { profiles: number; replied: number } | { error: string };
  try {
    autoReply = await runAutoReplies(admin);
  } catch (e) {
    autoReply = { error: e instanceof Error ? e.message : "erro" };
  }

  return NextResponse.json({ processed: posts.length, results, autoReply, ranAt: nowIso });
}
