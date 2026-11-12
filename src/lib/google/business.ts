/**
 * Chamadas à Business Profile API do Google (contas, locais e postagens).
 */

const ACCOUNT_MGMT = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_V4 = "https://mybusiness.googleapis.com/v4";

export interface GoogleAccount {
  name: string; // accounts/123
  accountName?: string;
  type?: string;
}

export interface GoogleLocation {
  name: string; // locations/456 (ou accounts/123/locations/456 no v4)
  title?: string;
  storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string };
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function listAccounts(accessToken: string): Promise<GoogleAccount[]> {
  const data = await getJson<{ accounts?: GoogleAccount[] }>(
    `${ACCOUNT_MGMT}/accounts`,
    accessToken,
  );
  return data.accounts ?? [];
}

export async function listLocations(
  accessToken: string,
  accountName: string,
): Promise<GoogleLocation[]> {
  const fields = "locations.name,locations.title,locations.storefrontAddress";
  const url = `${BUSINESS_INFO}/${accountName}/locations?readMask=name,title,storefrontAddress&pageSize=100`;
  const data = await getJson<{ locations?: GoogleLocation[] }>(url, accessToken);
  void fields;
  return data.locations ?? [];
}

export interface LocalPostInput {
  summary: string;
  topicType: "STANDARD" | "EVENT" | "OFFER";
  mediaUrl?: string | null;
  ctaType?: string | null;
  ctaUrl?: string | null;
  eventTitle?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
}

/**
 * Envia uma foto para a GALERIA do perfil (aba "Fotos"), associada ao local.
 * A imagem vai por URL pública. `accountLocation` = accounts/{acc}/locations/{loc}.
 */
export async function createMediaItem(
  accessToken: string,
  accountLocation: string,
  sourceUrl: string,
): Promise<{ name: string }> {
  const body = {
    mediaFormat: "PHOTO",
    locationAssociation: { category: "ADDITIONAL" },
    sourceUrl,
  };
  const res = await fetch(`${LEGACY_V4}/${accountLocation}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createMediaItem ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Link direto de "escrever avaliação" do perfil (para QR code / compartilhar). */
export async function getReviewLink(
  accessToken: string,
  accountLocation: string,
): Promise<string | null> {
  const loc = accountLocation.split("/locations/")[1];
  if (!loc) return null;
  try {
    const data = await getJson<{ metadata?: { newReviewUri?: string } }>(
      `${BUSINESS_INFO}/locations/${loc}?readMask=metadata`,
      accessToken,
    );
    return data.metadata?.newReviewUri ?? null;
  } catch {
    return null;
  }
}

export interface GalleryMedia {
  name: string;
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime?: string;
  mediaFormat?: string; // "PHOTO" | "VIDEO"
  insights?: { viewCount?: string };
}

/** Lista as fotos da galeria do perfil (via v4). Para confirmar o que subiu. */
export async function listMedia(
  accessToken: string,
  accountLocation: string,
): Promise<GalleryMedia[]> {
  const data = await getJson<{ mediaItems?: GalleryMedia[] }>(
    `${LEGACY_V4}/${accountLocation}/media?pageSize=50`,
    accessToken,
  );
  return data.mediaItems ?? [];
}

/** "accounts/1/locations/2" → "locations/2" (recurso da Business Information API). */
function locationResource(accountLocation: string): string {
  const m = accountLocation.match(/locations\/[^/]+$/);
  return m ? m[0] : accountLocation;
}

/** Lê a descrição atual do perfil (campo profile.description). */
export async function getProfileDescription(
  accessToken: string,
  accountLocation: string,
): Promise<string> {
  const loc = locationResource(accountLocation);
  try {
    const data = await getJson<{ profile?: { description?: string } }>(
      `${BUSINESS_INFO}/${loc}?readMask=profile.description`,
      accessToken,
    );
    return data.profile?.description ?? "";
  } catch {
    return "";
  }
}

/** Atualiza (publica) a descrição do perfil no Google. */
export async function updateProfileDescription(
  accessToken: string,
  accountLocation: string,
  description: string,
): Promise<void> {
  const loc = locationResource(accountLocation);
  const url = `${BUSINESS_INFO}/${loc}?updateMask=profile.description`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ profile: { description } }),
  });
  if (!res.ok) throw new Error(`updateDescription ${res.status}: ${await res.text()}`);
}

/** Coordenadas (lat/lng) de um local do perfil, se disponíveis. */
export async function getLocationLatLng(
  accessToken: string,
  locationOnly: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${BUSINESS_INFO}/${locationOnly}?readMask=latlng`;
    const data = await getJson<{ latlng?: { latitude?: number; longitude?: number } }>(
      url,
      accessToken,
    );
    if (data.latlng?.latitude != null && data.latlng?.longitude != null) {
      return { lat: data.latlng.latitude, lng: data.latlng.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cria uma postagem local (localPost) via API legada v4.
 * `accountLocation` deve ser no formato accounts/{acc}/locations/{loc}.
 */
export async function createLocalPost(
  accessToken: string,
  accountLocation: string,
  post: LocalPostInput,
): Promise<{ name: string }> {
  const body: Record<string, unknown> = {
    languageCode: "pt-BR",
    summary: post.summary,
    topicType: post.topicType,
  };

  if (post.mediaUrl) {
    body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.mediaUrl }];
  }

  if (post.ctaType) {
    body.callToAction =
      post.ctaType === "CALL"
        ? { actionType: "CALL" }
        : { actionType: post.ctaType, url: post.ctaUrl ?? undefined };
  }

  if (post.topicType === "EVENT" && post.eventTitle && post.eventStart) {
    const toDate = (iso: string) => {
      const d = new Date(iso);
      return {
        date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() },
        time: { hours: d.getUTCHours(), minutes: d.getUTCMinutes() },
      };
    };
    body.event = {
      title: post.eventTitle,
      schedule: {
        startDate: toDate(post.eventStart).date,
        startTime: toDate(post.eventStart).time,
        ...(post.eventEnd
          ? { endDate: toDate(post.eventEnd).date, endTime: toDate(post.eventEnd).time }
          : {}),
      },
    };
  }

  const res = await fetch(`${LEGACY_V4}/${accountLocation}/localPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createLocalPost ${res.status}: ${await res.text()}`);
  return res.json();
}
