import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BASE = "https://places.googleapis.com/v1";

/**
 * Busca COMPLETA (Text Search) para o "Ver todas" da Pré-análise: diferente do
 * autocomplete (que traz só ~5), aqui devolve até 20 estabelecimentos por
 * página, com `nextPageToken` para "Carregar mais". Serve para listar as
 * empresas de uma rua/avenida ou de um segmento numa cidade
 * (ex.: "pizzaria em Sorocaba", "Av. General Carneiro, Sorocaba").
 * Leve e sem custo de crédito — a auditoria só roda ao escolher uma.
 */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured", results: [] }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado", results: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const pageToken = searchParams.get("pageToken") ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (q.length < 3 && !pageToken) return NextResponse.json({ results: [] });

  // Ao paginar, o Google exige os MESMOS parâmetros + o pageToken.
  const body: Record<string, unknown> = {
    textQuery: q,
    languageCode: "pt-BR",
    regionCode: "BR",
    maxResultCount: 20,
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
  }
  if (pageToken) body.pageToken = pageToken;

  try {
    const res = await fetch(`${BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,nextPageToken",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = (await res.json()) as {
      places?: { id: string; displayName?: { text: string }; formattedAddress?: string }[];
      nextPageToken?: string;
    };
    const results = (data.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
    }));
    return NextResponse.json({ results, nextPageToken: data.nextPageToken ?? null });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
