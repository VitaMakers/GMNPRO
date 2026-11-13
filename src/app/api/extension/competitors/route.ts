import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataForSeoConfigured, mapsTop } from "@/lib/dataforseo";
import type { AuditReport } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Recalcula o ranking no Google Maps para um nicho (keyword) escolhido pelo usuário. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  if (!dataForSeoConfigured()) return NextResponse.json({ error: "not_configured", detail: "DataForSEO não configurado." }, { status: 503 });

  const { scanId, keyword } = (await request.json().catch(() => ({}))) as { scanId?: string; keyword?: string };
  if (!scanId || !keyword?.trim()) return NextResponse.json({ error: "dados" }, { status: 400 });

  const { data } = await supabase.from("extension_scans").select("report").eq("user_id", user.id).eq("id", scanId).maybeSingle();
  const report = data?.report as AuditReport | undefined;
  const p = report?.place;
  if (!p || p.lat == null || p.lng == null) return NextResponse.json({ error: "sem_coordenadas" }, { status: 422 });

  try {
    const { items, myRank } = await mapsTop(keyword.trim(), p.lat, p.lng, { title: p.name });
    if (items.length === 0) return NextResponse.json({ error: "sem_resultados", detail: "Nenhum resultado para esse nicho na região." }, { status: 404 });
    const rated = items.filter((i) => i.rating);
    const segmentAvg = rated.length ? Math.round((rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length) * 10) / 10 : null;
    return NextResponse.json({
      ok: true,
      competitors: {
        keyword: keyword.trim(), segmentAvg, myRank, total: items.length,
        list: items.slice(0, 20).map((i) => ({ rank: i.rank, name: i.title, rating: i.rating ?? 0, reviewCount: i.reviews ?? 0, isPaid: i.isPaid, image: i.image, category: i.category, openNow: i.openNow, website: i.website, snippet: i.snippet, lat: i.lat ?? 0, lng: i.lng ?? 0, isMe: i.me })),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "falha", detail: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
