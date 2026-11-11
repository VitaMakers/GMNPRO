/** Foto de perfil/logo do local (Google My Business API v4 - media). */

const LEGACY_V4 = "https://mybusiness.googleapis.com/v4";

interface RawMedia {
  mediaFormat?: string;
  googleUrl?: string;
  thumbnailUrl?: string;
  locationAssociation?: { category?: string };
}

/**
 * Tenta descobrir a melhor imagem para representar o local:
 * prioriza PROFILE (logo), depois COVER, depois qualquer foto.
 * Retorna a URL, ou "" quando não há nenhuma (para cachear "sem foto").
 */
export async function fetchProfilePhoto(
  accessToken: string,
  accountLocation: string,
): Promise<string> {
  const url = `${LEGACY_V4}/${accountLocation}/media?pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "";

  const data = (await res.json()) as { mediaItems?: RawMedia[] };
  const items = (data.mediaItems ?? []).filter((m) => m.mediaFormat === "PHOTO");
  if (items.length === 0) return "";

  const byCat = (cat: string) =>
    items.find((m) => m.locationAssociation?.category === cat);

  const pick = byCat("PROFILE") ?? byCat("COVER") ?? byCat("LOGO") ?? items[0];
  return pick?.thumbnailUrl ?? pick?.googleUrl ?? "";
}
