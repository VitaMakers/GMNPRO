import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nearbyCompetitors } from "@/lib/places";
import type { AuditReport } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Recalcula a seção de concorrentes para um nicho (keyword) escolhido pelo usuário. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const { scanId, keyword } = (await request.json().catch(() => ({}))) as { scanId?: string; keyword?: string };
  if (!scanId || !keyword?.trim()) return NextResponse.json({ error: "dados" }, { status: 400 });

  const { data } = await supabase.from("extension_scans").select("report").eq("user_id", user.id).eq("id", scanId).maybeSingle();
  const report = data?.report as AuditReport | undefined;
  const p = report?.place;
  if (!p || p.lat == null || p.lng == null) return NextResponse.json({ error: "sem_coordenadas" }, { status: 422 });

  const comps = await nearbyCompetitors(p.lat, p.lng, undefined, 8000, keyword.trim());
  if (comps.length === 0) return NextResponse.json({ error: "sem_resultados", detail: "Nenhuma empresa encontrada para esse nicho na região." }, { status: 404 });

  const myName = (p.name || "").toLowerCase();
  const withMe = comps.map((c) => ({ ...c, isMe: c.name.toLowerCase() === myName }));
  if (!withMe.some((c) => c.isMe)) withMe.push({ name: p.name, rating: p.rating ?? 0, reviewCount: p.reviewCount ?? 0, lat: p.lat, lng: p.lng, isMe: true });
  const rated = withMe.filter((c) => c.rating > 0);
  const segmentAvg = rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : null;
  const avgReviews = Math.round(withMe.reduce((s, c) => s + c.reviewCount, 0) / withMe.length);
  const byReviews = [...withMe].sort((a, b) => b.reviewCount - a.reviewCount);
  const myRank = byReviews.findIndex((c) => c.isMe) + 1 || null;

  return NextResponse.json({
    ok: true,
    competitors: {
      radiusKm: 8, segmentAvg, avgReviews, myReviews: p.reviewCount ?? 0, category: p.primaryType, keyword: keyword.trim(),
      myRank, total: withMe.length,
      list: byReviews.slice(0, 10).map((c) => ({ name: c.name, rating: c.rating, reviewCount: c.reviewCount, lat: c.lat, lng: c.lng, isMe: c.isMe })),
    },
  });
}
