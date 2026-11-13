import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditPlace, type PlaceData } from "@/lib/audit";
import { parseScrape, type ExtScrape } from "@/lib/extensionParse";
import { lookupPlace, nearbyCompetitors } from "@/lib/places";

export const dynamic = "force-dynamic";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export function OPTIONS() { return cors(NextResponse.json({ ok: true })); }

/** Recebe o conteúdo bruto raspado pela extensão e gera a pré-análise.
 *  A extração fica aqui (servidor) para melhorar sem reinstalar a extensão. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return cors(NextResponse.json({ error: "nao_autenticado", detail: "Faça login no GMN PRO neste navegador." }, { status: 401 }));

  const body = (await request.json().catch(() => ({}))) as ExtScrape;
  if (!body.name) return cors(NextResponse.json({ error: "sem_dados" }, { status: 400 }));

  const prof = parseScrape(body);

  // Enriquece com a Places API (dados estruturados e confiáveis), para que a
  // análise seja a MESMA venha da busca ou do Maps. Extensão mantém os extras.
  const q = [prof.name, prof.address].filter(Boolean).join(" ");
  const pl = await lookupPlace(q);

  const place: PlaceData = {
    name: prof.name,
    address: pl?.address ?? prof.address,
    primaryType: pl?.category ?? prof.category,
    phone: pl?.phone ?? prof.phone,
    website: pl?.website ?? prof.website,
    rating: pl?.rating ?? prof.rating,
    reviewCount: pl?.reviewCount ?? prof.reviewCount,
    hasHours: pl?.hasHours ?? prof.hasHours,
    photoCount: Math.max(pl?.photoCount ?? 0, prof.photoCount ?? 0) || undefined,
    description: pl?.description ?? prof.description,
    businessStatus: pl?.businessStatus ?? prof.businessStatus,
    googleMapsUri: pl?.mapsUri ?? prof.mapsUri,
    photoUrl: prof.photoUrl,
    photoName: pl?.photoName,
    postsCount: prof.postsCount, qaCount: prof.qaCount, qaAnswered: prof.qaAnswered,
    attributesCount: prof.attributesCount, secondaryCount: prof.secondaryCount,
    hasSpecialHours: prof.hasSpecialHours, videoCount: prof.videoCount, verified: prof.verified,
    hasLogo: prof.hasLogo, reviewReplies: prof.ownerReplies, reviewsSampled: prof.reviewsSampled,
    lat: pl?.lat, lng: pl?.lng, source: "extension",
  };
  const report = auditPlace(place);
  report.confirmed = !!pl;

  // Análise de concorrentes/segmento (raio de 3 km) — como o GBP.
  if (pl?.lat != null && pl?.lng != null) {
    const radiusKm = 8;
    // Palavra do nicho: usa a categoria se for específica; senão a 1ª palavra do nome.
    const generic = /^(aliment|comida|estabelec|empresa|serviç|loja|local|neg[oó]cio)/i;
    const cat = (pl.category || prof.category || "").trim();
    const nameWord = (prof.name || "").split(/[\s|–\-]/).map((w) => w.trim()).find((w) => w.length >= 3);
    const keyword = cat && !generic.test(cat) ? cat : (nameWord || cat);
    const comps = await nearbyCompetitors(pl.lat, pl.lng, pl.primaryType, radiusKm * 1000, keyword);
    if (comps.length > 0) {
      const myName = (prof.name || "").toLowerCase();
      const withMe = comps.map((c) => ({ ...c, isMe: c.name.toLowerCase() === myName }));
      if (!withMe.some((c) => c.isMe)) withMe.push({ name: prof.name, rating: pl.rating ?? 0, reviewCount: pl.reviewCount ?? 0, lat: pl.lat, lng: pl.lng, isMe: true });
      const rated = withMe.filter((c) => c.rating > 0);
      const segmentAvg = rated.length ? Math.round((rated.reduce((s2, c) => s2 + c.rating, 0) / rated.length) * 10) / 10 : null;
      const avgReviews = Math.round(withMe.reduce((s2, c) => s2 + c.reviewCount, 0) / withMe.length);
      const myReviews = pl.reviewCount ?? 0;
      const byReviews = [...withMe].sort((a, b) => b.reviewCount - a.reviewCount);
      const myRank = byReviews.findIndex((c) => c.isMe) + 1 || null;
      report.competitors = {
        radiusKm, segmentAvg, avgReviews, myReviews, category: pl.category, myRank, total: withMe.length,
        list: byReviews.slice(0, 10).map((c) => ({ name: c.name, rating: c.rating, reviewCount: c.reviewCount, lat: c.lat, lng: c.lng, isMe: c.isMe })),
      };
    }
  }

  const { data: saved } = await supabase
    .from("extension_scans")
    .insert({ user_id: user.id, name: prof.name, report, raw: { parsed: prof, textSnippet: (body.text ?? "").slice(0, 4000) } })
    .select("id")
    .maybeSingle();

  const base = process.env.APP_BASE_URL || new URL(request.url).origin;
  return cors(NextResponse.json({ ok: true, scanId: saved?.id ?? null, url: `${base}/auditoria?scan=${saved?.id ?? ""}`, report, parsed: prof }));
}
