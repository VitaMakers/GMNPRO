/**
 * Consulta estruturada na Places API (New) para enriquecer a pré-análise da
 * extensão — garante os mesmos dados (nota, avaliações, categoria, endereço,
 * telefone, site, fotos, coordenadas) venha de onde vier a raspagem.
 */
const BASE = "https://places.googleapis.com/v1";

export interface PlacesInfo {
  rating?: number; reviewCount?: number; category?: string; address?: string;
  phone?: string; website?: string; hasHours?: boolean; photoCount?: number;
  photoName?: string; businessStatus?: string; description?: string;
  lat?: number; lng?: number; mapsUri?: string;
}

export function placesConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

export async function lookupPlace(query: string): Promise<PlacesInfo | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !query.trim()) return null;
  try {
    const sr = await fetch(`${BASE}/places:searchText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName" },
      body: JSON.stringify({ textQuery: query, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 1 }),
    });
    if (!sr.ok) return null;
    const sd = (await sr.json()) as { places?: { id: string }[] };
    const id = sd.places?.[0]?.id;
    if (!id) return null;

    const fields = ["displayName", "formattedAddress", "primaryTypeDisplayName", "primaryType",
      "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "rating", "userRatingCount",
      "regularOpeningHours", "photos", "businessStatus", "editorialSummary", "googleMapsUri", "location"].join(",");
    const dr = await fetch(`${BASE}/places/${id}?languageCode=pt-BR`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields } });
    if (!dr.ok) return null;
    const d = (await dr.json()) as {
      formattedAddress?: string; primaryTypeDisplayName?: { text: string }; primaryType?: string;
      nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string;
      rating?: number; userRatingCount?: number; regularOpeningHours?: { weekdayDescriptions?: string[] };
      photos?: { name?: string }[]; businessStatus?: string; editorialSummary?: { text: string };
      googleMapsUri?: string; location?: { latitude?: number; longitude?: number };
    };
    return {
      rating: d.rating, reviewCount: d.userRatingCount,
      category: d.primaryTypeDisplayName?.text ?? d.primaryType,
      address: d.formattedAddress, phone: d.nationalPhoneNumber ?? d.internationalPhoneNumber,
      website: d.websiteUri, hasHours: !!d.regularOpeningHours?.weekdayDescriptions?.length,
      photoCount: Array.isArray(d.photos) ? d.photos.length : undefined,
      photoName: d.photos?.[0]?.name, businessStatus: d.businessStatus,
      description: d.editorialSummary?.text, lat: d.location?.latitude, lng: d.location?.longitude,
      mapsUri: d.googleMapsUri,
    };
  } catch {
    return null;
  }
}
