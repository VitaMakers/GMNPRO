import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditPlace, type PlaceData } from "@/lib/audit";
import { parseScrape, type ExtScrape } from "@/lib/extensionParse";

export const dynamic = "force-dynamic";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export function OPTIONS() { return cors(NextResponse.json({ ok: true })); }

/** Pré-análise GRÁTIS e ILIMITADA: usa só os dados lidos pela extensão (como o
 *  GBP). O ranking de concorrentes é um passo separado que gasta 1 crédito. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return cors(NextResponse.json({ error: "nao_autenticado", detail: "Faça login no GMN Profile neste navegador." }, { status: 401 }));

  const body = (await request.json().catch(() => ({}))) as ExtScrape;
  if (!body.name) return cors(NextResponse.json({ error: "sem_dados" }, { status: 400 }));

  const prof = parseScrape(body);
  const place: PlaceData = {
    name: prof.name, address: prof.address, primaryType: prof.category, phone: prof.phone, website: prof.website,
    rating: prof.rating, reviewCount: prof.reviewCount, hasHours: prof.hasHours, photoCount: prof.photoCount,
    description: prof.description, businessStatus: prof.businessStatus, googleMapsUri: prof.mapsUri, photoUrl: prof.photoUrl,
    postsCount: prof.postsCount, qaCount: prof.qaCount, qaAnswered: prof.qaAnswered,
    attributesCount: prof.attributesCount, secondaryCount: prof.secondaryCount,
    hasSpecialHours: prof.hasSpecialHours, videoCount: prof.videoCount, verified: prof.verified,
    hasLogo: prof.hasLogo, reviewReplies: prof.ownerReplies, reviewsSampled: prof.reviewsSampled,
    photos360: prof.photos360, lastPost: prof.lastPost, source: "extension",
  };
  const report = auditPlace(place);

  const { data: saved } = await supabase
    .from("extension_scans")
    .insert({ user_id: user.id, name: prof.name, report, raw: { parsed: prof, textSnippet: (body.text ?? "").slice(0, 4000) } })
    .select("id")
    .maybeSingle();

  const base = process.env.APP_BASE_URL || new URL(request.url).origin;
  return cors(NextResponse.json({ ok: true, scanId: saved?.id ?? null, url: `${base}/auditoria?scan=${saved?.id ?? ""}`, report, parsed: prof }));
}
