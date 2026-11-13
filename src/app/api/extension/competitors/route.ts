import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataForSeoConfigured, mapsTop } from "@/lib/dataforseo";
import { lookupPlace } from "@/lib/places";
import { getAccess } from "@/lib/access";
import { getCredits, spendCredits, creditsEligible } from "@/lib/credits";
import type { AuditReport } from "@/lib/audit";

export const dynamic = "force-dynamic";
const COST = 1; // 1 crédito por consulta de concorrentes

/** Ranking de concorrentes no Google Maps — gasta 1 crédito por consulta. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  if (!dataForSeoConfigured()) return NextResponse.json({ error: "not_configured", detail: "DataForSEO não configurado." }, { status: 503 });

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.entitlements.geoGrid) return NextResponse.json({ error: "recurso_de_agencia", detail: "O ranking de concorrentes faz parte dos planos Agência." }, { status: 403 });

  const { scanId, keyword } = (await request.json().catch(() => ({}))) as { scanId?: string; keyword?: string };
  if (!scanId || !keyword?.trim()) return NextResponse.json({ error: "dados" }, { status: 400 });

  // Créditos (usa a conta efetiva: dono quando membro).
  const acctId = access.accountId;
  if (!creditsEligible(access)) return NextResponse.json({ error: "sem_creditos", detail: "Créditos liberados no plano pago. No teste não há créditos." }, { status: 402 });
  const credits = await getCredits(supabase, acctId, access);
  if (credits < COST) return NextResponse.json({ error: "sem_creditos", detail: "Você não tem créditos suficientes.", credits }, { status: 402 });

  const { data } = await supabase.from("extension_scans").select("report").eq("id", scanId).maybeSingle();
  const report = data?.report as AuditReport | undefined;
  const p = report?.place;
  if (!p?.name) return NextResponse.json({ error: "sem_scan" }, { status: 404 });

  try {
    // Coordenadas via Places (não existem na pré-análise grátis).
    const geo = p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : await lookupPlace([p.name, p.address].filter(Boolean).join(" "));
    const lat = (geo as { lat?: number } | null)?.lat;
    const lng = (geo as { lng?: number } | null)?.lng;
    if (lat == null || lng == null) return NextResponse.json({ error: "sem_coordenadas", detail: "Não encontrei a localização dessa empresa no Google." }, { status: 422 });

    const { items, myRank } = await mapsTop(keyword.trim(), lat, lng, { title: p.name });
    if (items.length === 0) return NextResponse.json({ error: "sem_resultados", detail: `O Google não retornou empresas para "${keyword.trim()}" nessa região. Tente um termo mais amplo (ex.: só "buffet").` }, { status: 404 });

    await spendCredits(supabase, acctId, COST);
    const remaining = Math.max(0, credits - COST);
    const rated = items.filter((i) => i.rating);
    const segmentAvg = rated.length ? Math.round((rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length) * 10) / 10 : null;
    return NextResponse.json({
      ok: true, credits: remaining,
      competitors: {
        keyword: keyword.trim(), segmentAvg, myRank, total: items.length,
        list: items.slice(0, 20).map((i) => ({ rank: i.rank, name: i.title, rating: i.rating ?? 0, reviewCount: i.reviews ?? 0, isPaid: i.isPaid, image: i.image, category: i.category, openNow: i.openNow, website: i.website, snippet: i.snippet, lat: i.lat ?? 0, lng: i.lng ?? 0, isMe: i.me })),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "falha", detail: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
