import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BASE = "https://places.googleapis.com/v1";

type Row = { placeId: string; name: string; address: string };
type RawPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  primaryType?: string;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
};

// Tipos que NÃO são empresa (rua, bairro, cidade, CEP…). Servem de ponto de
// referência, mas não dá pra "analisar" — então nunca entram na lista.
const NON_BIZ = new Set([
  "route", "street_address", "premise", "subpremise", "locality", "sublocality",
  "sublocality_level_1", "neighborhood", "postal_code", "postal_code_prefix",
  "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "country", "political", "plus_code", "geocode", "intersection",
]);

function isBusiness(p: RawPlace): boolean {
  if (p.primaryType) return !NON_BIZ.has(p.primaryType);
  const t = p.types ?? [];
  return t.length > 0 && t.some((x) => !NON_BIZ.has(x));
}
function toRow(p: RawPlace): Row {
  return { placeId: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "" };
}

const TEXT_MASK = "places.id,places.displayName,places.formattedAddress,places.primaryType,places.types,places.location,nextPageToken";
const NEARBY_MASK = "places.id,places.displayName,places.formattedAddress,places.primaryType,places.types";

async function textSearch(key: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": TEXT_MASK },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { places: [] as RawPlace[], nextPageToken: undefined as string | undefined };
  const d = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string };
  return { places: d.places ?? [], nextPageToken: d.nextPageToken };
}

async function nearby(key: string, lat: number, lng: number, radius: number) {
  const res = await fetch(`${BASE}/places:searchNearby`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": NEARBY_MASK },
    body: JSON.stringify({
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });
  if (!res.ok) return [] as RawPlace[];
  const d = (await res.json()) as { places?: RawPlace[] };
  return d.places ?? [];
}

/**
 * Busca COMPLETA do "Ver todas" da Pré-análise. Dois modos, automático:
 *  - TEXTO (segmento/cidade, ex.: "pizzaria em Sorocaba"): Text Search paginado.
 *  - PERTO (rua/avenida, ex.: "Av. General Osório, Sorocaba"): acha o ponto da
 *    rua e lista as EMPRESAS ao redor (Nearby), expandindo o raio no "carregar
 *    mais". Assim deixa de devolver só a rua e passa a mostrar os comércios.
 * Leve e sem custo de crédito — a auditoria só roda ao escolher uma.
 */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured", results: [] }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado", results: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const pageToken = searchParams.get("pageToken") ?? "";
  const mode = searchParams.get("mode") ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const clat = Number(searchParams.get("clat"));
  const clng = Number(searchParams.get("clng"));
  const radius = Number(searchParams.get("radius"));
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  try {
    // ---- "Carregar mais" no modo PERTO: amplia o raio ao redor do mesmo ponto.
    if (mode === "nearby" && Number.isFinite(clat) && Number.isFinite(clng)) {
      const r = Number.isFinite(radius) && radius > 0 ? Math.min(radius, 5000) : 800;
      const places = (await nearby(key, clat, clng, r)).filter(isBusiness).map(toRow);
      const nextRadius = r < 5000 ? Math.min(r + 800, 5000) : null;
      return NextResponse.json({ results: places, mode: "nearby", center: { lat: clat, lng: clng }, nextRadius });
    }

    // ---- "Carregar mais" no modo TEXTO: próxima página do Google.
    if (pageToken) {
      const body: Record<string, unknown> = { textQuery: q, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20, pageToken };
      if (hasGeo) body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
      const { places, nextPageToken } = await textSearch(key, body);
      return NextResponse.json({ results: places.filter(isBusiness).map(toRow), mode: "text", nextPageToken: nextPageToken ?? null });
    }

    if (q.length < 3) return NextResponse.json({ results: [] });

    // ---- Primeira busca: tenta por TEXTO.
    const body: Record<string, unknown> = { textQuery: q, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20 };
    if (hasGeo) body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
    const { places, nextPageToken } = await textSearch(key, body);
    const businesses = places.filter(isBusiness);

    // Se achou empresas, é busca por nome/segmento: devolve com paginação.
    if (businesses.length > 0) {
      return NextResponse.json({ results: businesses.map(toRow), mode: "text", nextPageToken: nextPageToken ?? null });
    }

    // Não achou empresa (digitou uma rua/avenida/bairro): usa o ponto do
    // primeiro resultado (ou a localização da pessoa) e lista o que há ao redor.
    const ref = places[0]?.location;
    const center =
      ref?.latitude != null && ref?.longitude != null
        ? { lat: ref.latitude, lng: ref.longitude }
        : hasGeo
          ? { lat, lng }
          : null;

    if (!center) {
      return NextResponse.json({ results: [], mode: "text", nextPageToken: null });
    }

    const r0 = 800;
    const near = (await nearby(key, center.lat, center.lng, r0)).filter(isBusiness).map(toRow);
    return NextResponse.json({ results: near, mode: "nearby", center, nextRadius: r0 + 800 });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
