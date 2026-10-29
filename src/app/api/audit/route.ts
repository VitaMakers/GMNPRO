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
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: unknown[];
  businessStatus?: string;
  editorialSummary?: { text: string };
  googleMapsUri?: string;
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
    body: JSON.stringify({ textQuery: query, languageCode: "pt-BR", maxResultCount: 5 }),
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
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
  ].join(",");

  const res = await fetch(`${PLACES_BASE}/places/${id}?languageCode=pt-BR`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
  });
  if (!res.ok) throw new Error(`details ${res.status}`);
  return (await res.json()) as PlacesDetails;
}

function toPlaceData(d: PlacesDetails): PlaceData {
  return {
    name: d.displayName?.text ?? "Empresa",
    address: d.formattedAddress,
    primaryType: d.primaryTypeDisplayName?.text ?? d.primaryType,
    types: d.types,
    phone: d.nationalPhoneNumber ?? d.internationalPhoneNumber,
    website: d.websiteUri,
    rating: d.rating,
    reviewCount: d.userRatingCount,
    hasHours: !!(d.regularOpeningHours?.weekdayDescriptions?.length),
    photoCount: Array.isArray(d.photos) ? d.photos.length : 0,
    businessStatus: d.businessStatus,
    description: d.editorialSummary?.text,
    googleMapsUri: d.googleMapsUri,
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
    const report = auditPlace(toPlaceData(details));
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json(
      { error: "upstream", message: "Não foi possível consultar o Google agora. Tente de novo." },
      { status: 502 },
    );
  }
}
