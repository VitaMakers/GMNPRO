import { NextResponse } from "next/server";
import { auditPlace, type PlaceData } from "@/lib/audit";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { geocodeCityBR } from "@/lib/geocodeCity";
import { businessInfo, dataForSeoConfigured, mapsProspects, type BusinessInfo } from "@/lib/dataforseo";
import { getAccess } from "@/lib/access";
import { preAnaliseStatus, countPreAnalise } from "@/lib/preanalise";

const PLACES_BASE = "https://places.googleapis.com/v1";

interface PlacesSearchPlace {
  id: string;
  displayName?: { text: string };
  location?: { latitude?: number; longitude?: number };
  formattedAddress?: string;
}

interface PlacesDetails {
  displayName?: { text: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text: string };
  primaryType?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[]; openNow?: boolean };
  photos?: { name?: string }[];
  businessStatus?: string;
  editorialSummary?: { text: string };
  googleMapsUri?: string;
  priceLevel?: string;
  location?: { latitude?: number; longitude?: number };
}

async function searchPlaces(query: string, key: string) {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 10,
    }),
  });
  if (!res.ok) throw new Error(`Places busca ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: PlacesSearchPlace[] };
  return data.places ?? [];
}

async function placeDetails(id: string, key: string) {
  const fields = [
    "displayName",
    "formattedAddress",
    "primaryType",
    "primaryTypeDisplayName",
    "types",
    "nationalPhoneNumber",
    "internationalPhoneNumber",
    "websiteUri",
    "rating",
    "userRatingCount",
    "regularOpeningHours",
    "photos",
    "businessStatus",
    "editorialSummary",
    "googleMapsUri",
    "priceLevel",
    "location",
  ].join(",");

  const res = await fetch(`${PLACES_BASE}/places/${id}?languageCode=pt-BR`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
  });
  if (!res.ok) throw new Error(`details ${res.status}`);
  return (await res.json()) as PlacesDetails;
}

const PRICE_LEVEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Grátis",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

function toPlaceData(d: PlacesDetails, placeId: string): PlaceData {
  return {
    placeId,
    name: d.displayName?.text ?? "Empresa",
    address: d.formattedAddress,
    primaryType: d.primaryTypeDisplayName?.text ?? d.primaryType,
    types: d.types,
    phone: d.nationalPhoneNumber ?? d.internationalPhoneNumber,
    website: d.websiteUri,
    rating: d.rating,
    reviewCount: d.userRatingCount,
    hasHours: !!(d.regularOpeningHours?.weekdayDescriptions?.length),
    weekdayDescriptions: d.regularOpeningHours?.weekdayDescriptions,
    openNow: d.regularOpeningHours?.openNow,
    photoCount: Array.isArray(d.photos) ? d.photos.length : 0,
    photoName: Array.isArray(d.photos) && d.photos[0]?.name ? d.photos[0].name : undefined,
    businessStatus: d.businessStatus,
    description: d.editorialSummary?.text,
    googleMapsUri: d.googleMapsUri,
    searchUri: `https://search.google.com/local/reviews?placeid=${placeId}`,
    priceLevel: d.priceLevel ? PRICE_LEVEL[d.priceLevel] : undefined,
    lat: d.location?.latitude,
    lng: d.location?.longitude,
  };
}

/**
 * Teto mensal de consultas de detalhes na Google Places API (somando todas as
 * contas). Fica abaixo da cota grátis do Google; passou disso, a Pré-análise
 * busca a ficha no DataForSEO até virar o mês. Ajustável por variável de
 * ambiente PLACES_FREE_MONTHLY_CAP.
 */
const PLACES_MONTHLY_CAP = Math.max(0, Number(process.env.PLACES_FREE_MONTHLY_CAP ?? 800) || 0);

/** Quantas pré-análises já rodaram neste mês, em todas as contas. */
async function preAnalisesThisMonth(): Promise<number> {
  try {
    const ym = new Date().toISOString().slice(0, 7);
    const { data } = await createAdminClient().from("ai_usage").select("count").eq("location_name", "_preanalise").eq("kind", "preanalise").eq("ym", ym);
    return ((data as { count?: number }[] | null) ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
  } catch {
    return 0; // sem contagem: segue no Google (comportamento anterior)
  }
}

function fromBusinessInfo(b: BusinessInfo, placeId: string): PlaceData {
  return {
    placeId,
    name: b.name,
    address: b.address,
    primaryType: b.category,
    types: b.additionalCategories,
    phone: b.phone,
    website: b.website,
    rating: b.rating,
    reviewCount: b.reviewCount,
    hasHours: !!b.weekdayDescriptions?.length,
    weekdayDescriptions: b.weekdayDescriptions,
    openNow: b.openNow,
    // A Places API devolve no máximo 10 fotos; limita igual para a nota da
    // pré-análise não mudar conforme a fonte dos dados.
    photoCount: Math.min(b.totalPhotos ?? 0, 10),
    photoUrl: b.mainImage,
    description: b.description,
    googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    searchUri: `https://search.google.com/local/reviews?placeid=${placeId}`,
    priceLevel: b.priceLevel,
    lat: b.lat,
    lng: b.lng,
  };
}

/**
 * Ficha da empresa para a pré-análise: Google Places enquanto estiver dentro
 * do teto mensal (cota grátis); depois disso — ou se o Google recusar a
 * chamada — DataForSEO. Sem DataForSEO configurado, continua no Google.
 */
async function loadPlace(placeId: string, key: string | undefined): Promise<{ place: PlaceData; source: "google" | "dataforseo" }> {
  const canFallback = dataForSeoConfigured();
  const overCap = canFallback && (await preAnalisesThisMonth()) >= PLACES_MONTHLY_CAP;
  if (!overCap && key) {
    try {
      return { place: toPlaceData(await placeDetails(placeId, key), placeId), source: "google" };
    } catch (e) {
      if (!canFallback) throw e;
      console.error("[pre-analise] Google Places falhou; usando DataForSEO:", e instanceof Error ? e.message : e);
    }
  }
  const info = await businessInfo(placeId);
  if (!info) throw new Error("Não encontramos os dados públicos desta empresa agora. Tente de novo em instantes.");
  return { place: fromBusinessInfo(info, placeId), source: "dataforseo" };
}

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const placeId = searchParams.get("placeId")?.trim();

  // Funciona com o Google Places, com o DataForSEO ou com os dois.
  if (!key && !dataForSeoConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "A busca de empresas ainda não foi configurada." },
      { status: 503 },
    );
  }
  if (!q && !placeId) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  try {
    // Exige login nas duas fases: as consultas têm custo.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "nao_autenticado", message: "Entre na sua conta para analisar." }, { status: 401 });
    const access = await getAccess(supabase, user.id, user.email);
    if (!access.allowed) return NextResponse.json({ error: "sem_acesso", message: "Seu acesso expirou. Assine para continuar." }, { status: 403 });

    // Fase 1: buscar candidatos pelo nome — Google Places; se ele recusar
    // (sem faturamento, cota, chave) ou não houver chave, DataForSEO.
    if (q && !placeId) {
      if (key) {
        try {
          const places = await searchPlaces(q, key);
          return NextResponse.json({
            results: places.map((p) => ({ placeId: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "", lat: p.location?.latitude ?? null, lng: p.location?.longitude ?? null })),
          });
        } catch (e) {
          if (!dataForSeoConfigured()) throw e;
          console.error("[pre-analise] busca no Google Places falhou; usando DataForSEO:", e instanceof Error ? e.message : e);
        }
      }
      // O Maps precisa de um ponto: usa a localização enviada pela tela ou
      // tenta reconhecer a cidade nas últimas palavras ("... Sorocaba").
      let at: { lat: number; lng: number } | undefined;
      const glat = Number(searchParams.get("lat")), glng = Number(searchParams.get("lng"));
      if (searchParams.get("lat") && Number.isFinite(glat) && Number.isFinite(glng)) at = { lat: glat, lng: glng };
      if (!at) {
        const words = q.split(/\s+/);
        for (const n of [3, 2, 1]) {
          if (words.length <= n) continue;
          const hit = await geocodeCityBR(words.slice(-n).join(" "));
          if (hit) { at = hit; break; }
        }
      }
      const found = await mapsProspects(q, 20, at);
      return NextResponse.json({
        results: found.filter((f) => f.placeId).map((f) => ({ placeId: f.placeId as string, name: f.name, address: f.address ?? "", lat: f.lat, lng: f.lng })),
      });
    }

    // Fase 2: auditar o lugar escolhido — conta no limite mensal de pré-análises.
    const pa = await preAnaliseStatus(supabase, user.id, access);
    if (!pa.allowed) {
      return NextResponse.json({ error: "limite", message: `Você atingiu o limite de ${pa.limit} pré-análises neste mês.` }, { status: 429 });
    }
    const { place, source } = await loadPlace(placeId!, key);
    const report = auditPlace(place);
    await countPreAnalise(supabase, user.id);
    console.log(`[pre-analise] fonte=${source}`);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      {
        error: "upstream",
        message: e instanceof Error ? e.message : "Não foi possível consultar o Google agora.",
      },
      { status: 502 },
    );
  }
}
