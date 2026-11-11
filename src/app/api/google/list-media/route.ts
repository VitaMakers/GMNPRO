import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { listMedia } from "@/lib/google/business";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);
    const media = await listMedia(accessToken, location);

    const views = (m: { insights?: { viewCount?: string } }) =>
      Number(m.insights?.viewCount ?? 0) || 0;
    const isVideo = (m: { mediaFormat?: string }) => m.mediaFormat === "VIDEO";

    // Agregados sobre TODA a galeria.
    let photoCount = 0;
    let videoCount = 0;
    let photoViews = 0;
    let videoViews = 0;
    for (const m of media) {
      if (isVideo(m)) {
        videoCount++;
        videoViews += views(m);
      } else {
        photoCount++;
        photoViews += views(m);
      }
    }

    const items = media
      .sort((a, b) => (b.createTime ?? "").localeCompare(a.createTime ?? ""))
      .slice(0, 24)
      .map((m) => ({
        thumbnailUrl: m.thumbnailUrl ?? m.googleUrl ?? null,
        createTime: m.createTime ?? null,
        isVideo: isVideo(m),
        views: views(m),
      }));

    return NextResponse.json({
      ok: true,
      total: media.length,
      photoCount,
      videoCount,
      photoViews,
      videoViews,
      totalViews: photoViews + videoViews,
      items,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
