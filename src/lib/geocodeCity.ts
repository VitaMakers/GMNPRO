/**
 * Localiza uma cidade brasileira (nome → coordenadas) usando serviços
 * públicos e gratuitos: OpenStreetMap (Nominatim) e, se falhar, Open-Meteo.
 * O Google Maps só devolve empresas quando a busca parte de um ponto, então
 * a Prospecção precisa disso antes de consultar.
 */
export interface CityPoint { lat: number; lng: number; label: string }

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "GMNProfile/1.0 (prospeccao)", "Accept-Language": "pt-BR" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function geocodeCityBR(city: string): Promise<CityPoint | null> {
  const q = city.trim();
  if (q.length < 2) return null;

  // 1) OpenStreetMap — entende "Taubaté SP", "Taubaté - SP" etc.
  const osm = (await getJson(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=br&format=jsonv2&limit=1&featureType=city`,
  )) as { lat?: string; lon?: string; display_name?: string }[] | null;
  const o = Array.isArray(osm) ? osm[0] : null;
  if (o?.lat && o?.lon && Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lon))) {
    return { lat: Number(o.lat), lng: Number(o.lon), label: (o.display_name ?? q).split(",").slice(0, 2).join(",").trim() };
  }

  // 2) Open-Meteo — só o nome da cidade (tira a UF, se vier junto).
  const nameOnly = q.replace(/[\s,/-]+[A-Za-z]{2}$/u, "").trim() || q;
  const om = (await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nameOnly)}&count=1&language=pt&countryCode=BR`,
  )) as { results?: { name?: string; latitude?: number; longitude?: number; admin1?: string }[] } | null;
  const m = om?.results?.[0];
  if (m && typeof m.latitude === "number" && typeof m.longitude === "number") {
    return { lat: m.latitude, lng: m.longitude, label: [m.name, m.admin1].filter(Boolean).join(", ") };
  }
  return null;
}
