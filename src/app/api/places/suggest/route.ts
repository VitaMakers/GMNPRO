import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BASE = "https://places.googleapis.com/v1";

/**
 * Sugestões em tempo real (autocomplete) para a Pré-análise — igual ao GBP
 * Check: conforme a pessoa digita o nome de uma empresa OU uma rua/bairro,
 * devolve os estabelecimentos que casam, com viés pela localização (quando a
 * pessoa permite), para listar o que está por perto. É leve e não gasta
 * crédito (os detalhes/auditoria só rodam quando escolhe um da lista).
 */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured", results: [] }, { status: 503 });

  // Ferramenta autenticada: evita expor o autocomplete publicamente.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado", results: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const input = (searchParams.get("q") ?? "").trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (input.length < 3) return NextResponse.json({ results: [] });

  const body: Record<string, unknown> = {
    input,
    languageCode: "pt-BR",
    includedRegionCodes: ["br"],
    // Só estabelecimentos (empresas) — não sugere ruas/endereços "puros",
    // porque o que a pessoa escolhe precisa ser uma empresa para analisar.
    includedPrimaryTypes: ["establishment"],
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    // Puxa primeiro o que está perto do ponto informado (localização da pessoa
    // ou região buscada), como o GBP Check faz.
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
  }

  try {
    const res = await fetch(`${BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify(body),
    });
    // Google recusou (sem faturamento, cota, chave): avisa a tela para orientar a
    // pessoa a usar o botão Buscar, que tem alternativa pelo DataForSEO.
    if (!res.ok) return NextResponse.json({ results: [], manual: true });
    const data = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        };
      }[];
    };
    const results = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
      .map((p) => ({
        placeId: p.placeId as string,
        name: p.structuredFormat?.mainText?.text ?? "",
        address: p.structuredFormat?.secondaryText?.text ?? "",
      }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
