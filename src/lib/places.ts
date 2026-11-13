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
  lat?: number; lng?: number; mapsUri?: string; primaryType?: string;
}

export interface Competitor { name: string; rating: number; reviewCount: number; lat: number; lng: number; }

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
      "regularOpeningHours", "photos", "businessStatus", "editorialSummary", "googleMapsUri", "location", "primaryType"].join(",");
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
      mapsUri: d.googleMapsUri, primaryType: d.primaryType,
    };
  } catch {
    return null;
  }
}

/** Concorrentes do mesmo segmento num raio (metros). Usa busca por categoria
 *  (mais robusta) com viés de localização e, se falhar, searchNearby por tipo. */
export async function nearbyCompetitors(lat: number, lng: number, type: string | undefined, radiusM = 3000, categoryText?: string): Promise<Competitor[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const mask = "places.displayName,places.rating,places.userRatingCount,places.location";
  const parse = (arr: { displayName?: { text: string }; rating?: number; userRatingCount?: number; location?: { latitude?: number; longitude?: number } }[]) =>
    (arr ?? []).filter((p) => p.location?.latitude != null)
      .map((p) => ({ name: p.displayName?.text ?? "", rating: p.rating ?? 0, reviewCount: p.userRatingCount ?? 0, lat: p.location!.latitude!, lng: p.location!.longitude! }));

  // 1) Busca por categoria com viés de localização.
  const q = (categoryText ?? "").trim();
  if (q) {
    try {
      const res = await fetch(`${BASE}/places:searchText`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask },
        body: JSON.stringify({ textQuery: q, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20,
          locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } } }),
      });
      if (res.ok) {
        const d = (await res.json()) as { places?: Parameters<typeof parse>[0] };
        const list = parse(d.places ?? []);
        if (list.length >= 3) return list;
      }
    } catch { /* tenta nearby */ }
  }

  // 2) Fallback: searchNearby por tipo (ou sem tipo).
  try {
    const body: Record<string, unknown> = { maxResultCount: 20, languageCode: "pt-BR",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } } };
    if (type) body.includedTypes = [type];
    const res = await fetch(`${BASE}/places:searchNearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask },
      body: JSON.stringify(body),
    });
    if (res.ok) { const d = (await res.json()) as { places?: Parameters<typeof parse>[0] }; return parse(d.places ?? []); }
  } catch { /* ignora */ }
  return [];
}
