import { NextResponse } from "next/server";
import { auditPlace, type PlaceData } from "@/lib/audit";

const PLACES_BASE = "https://places.googleapis.com/v1";

interface PlacesSearchPlace {
  id: string;
  displayName?: { text: string };
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
        "places.id,places.displayName,places.formattedAddress",
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

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const placeId = searchParams.get("placeId")?.trim();

  if (!key) {
    return NextResponse.json(
      { error: "not_configured", message: "A chave da Google Places API ainda não foi configurada." },
      { status: 503 },
    );
  }
  if (!q && !placeId) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  try {
    // Fase 1: buscar candidatos
    if (q && !placeId) {
      const places = await searchPlaces(q, key);
      return NextResponse.json({
        results: places.map((p) => ({
          placeId: p.id,
          name: p.displayName?.text ?? "",
          address: p.formattedAddress ?? "",
        })),
      });
    }

    // Fase 2: auditar o lugar escolhido
    const details = await placeDetails(placeId!, key);
    const report = auditPlace(toPlaceData(details, placeId!));
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
