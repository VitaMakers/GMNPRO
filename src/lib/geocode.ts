export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Busca coordenadas de uma cidade/endereço usando o Nominatim (OpenStreetMap).
 * Roda direto no navegador — sem chave de API e sem servidor próprio.
 */
export async function geocode(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "pt-BR");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Não foi possível buscar a localização agora.");

  const data: Array<{ display_name: string; lat: string; lon: string }> =
    await res.json();

  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}
