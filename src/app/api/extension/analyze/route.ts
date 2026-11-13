import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditPlace, type PlaceData } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ORIGIN = process.env.APP_BASE_URL ?? "";
function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export function OPTIONS() {
  return cors(NextResponse.json({ ok: true }));
}

interface ExtPayload {
  name?: string; address?: string; category?: string; phone?: string; website?: string;
  rating?: number; reviewCount?: number; hasHours?: boolean; photoCount?: number;
  description?: string; verified?: boolean; businessStatus?: string;
  postsCount?: number; qaCount?: number; qaAnswered?: number; attributesCount?: number;
  mapsUri?: string;
}

/** Recebe os dados raspados pela extensão (do navegador do usuário) e gera a
 *  pré-análise — custo zero, sem chamar APIs pagas. Autentica pelo cookie da sessão. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return cors(NextResponse.json({ error: "nao_autenticado", detail: "Faça login no GMN PRO neste navegador." }, { status: 401 }));

  const p = (await request.json().catch(() => ({}))) as ExtPayload;
  if (!p.name) return cors(NextResponse.json({ error: "sem_dados" }, { status: 400 }));

  const place: PlaceData = {
    name: p.name, address: p.address, primaryType: p.category, phone: p.phone, website: p.website,
    rating: p.rating, reviewCount: p.reviewCount, hasHours: p.hasHours, photoCount: p.photoCount,
    description: p.description, businessStatus: p.businessStatus ?? (p.verified ? "OPERATIONAL" : undefined),
    googleMapsUri: p.mapsUri, searchUri: undefined,
    postsCount: p.postsCount, qaCount: p.qaCount, qaAnswered: p.qaAnswered, attributesCount: p.attributesCount,
    source: "extension",
  };
  const report = auditPlace(place);

  const { data: saved } = await supabase
    .from("extension_scans")
    .insert({ user_id: user.id, name: p.name, report, raw: p })
    .select("id")
    .maybeSingle();

  const base = ORIGIN || new URL(request.url).origin;
  return cors(NextResponse.json({ ok: true, scanId: saved?.id ?? null, url: `${base}/auditoria?scan=${saved?.id ?? ""}`, report }));
}
