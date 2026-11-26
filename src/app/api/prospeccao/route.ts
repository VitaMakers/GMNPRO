import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { dataForSeoConfigured, mapsProspects, PROSPECT_CREDITS } from "@/lib/dataforseo";
import { getCredits, spendCredits, refundCredits } from "@/lib/credits";
import { geocodeCityBR } from "@/lib/geocodeCity";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Prospecção: lista empresas do Google Maps para um termo + cidade.
 * Exclusivo dos planos Agência. Consome PROSPECT_CREDITS créditos por busca,
 * debitados só depois que a busca devolve resultados.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) return NextResponse.json({ error: "sem_acesso" }, { status: 403 });
  if (!access.entitlements.geoGrid) {
    return NextResponse.json({ error: "recurso_de_agencia", detail: "Disponível nos planos Agência." }, { status: 403 });
  }
  if (!dataForSeoConfigured()) {
    return NextResponse.json({ error: "not_configured", detail: "Busca de empresas não configurada." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { term?: string; city?: string };
  const term = (body.term ?? "").trim().slice(0, 80);
  const city = (body.city ?? "").trim().slice(0, 80);
  if (term.length < 2 || city.length < 2) {
    return NextResponse.json({ error: "dados_incompletos", detail: "Informe o segmento e a cidade." }, { status: 400 });
  }

  const credits = await getCredits(supabase, user.id, access);
  if (credits < PROSPECT_CREDITS) {
    return NextResponse.json(
      { error: "sem_creditos", detail: `Cada busca usa ${PROSPECT_CREDITS} créditos; você tem ${credits}.`, credits },
      { status: 402 },
    );
  }

  // Localiza a cidade antes: o Google Maps precisa de um ponto de partida.
  const point = await geocodeCityBR(city);
  if (!point) {
    return NextResponse.json(
      { error: "cidade_nao_encontrada", detail: `Não encontrei a cidade "${city}". Confira o nome ou inclua o estado (ex.: Taubaté SP). Nenhum crédito foi cobrado.`, credits },
      { status: 422 },
    );
  }

  // Cobra ANTES de buscar (débito atômico) e estorna se der erro ou vier vazio:
  // assim ninguém recebe a lista sem pagar, nem com vários pedidos ao mesmo tempo.
  if (!(await spendCredits(supabase, user.id, PROSPECT_CREDITS))) {
    return NextResponse.json(
      { error: "sem_creditos", detail: `Cada busca usa ${PROSPECT_CREDITS} créditos e seu saldo não é suficiente.`, credits },
      { status: 402 },
    );
  }
  try {
    const items = await mapsProspects(`${term} em ${city}`, undefined, point);
    if (items.length === 0) {
      await refundCredits(supabase, user.id, PROSPECT_CREDITS);
      return NextResponse.json({ ok: true, items: [], credits, charged: 0 });
    }
    return NextResponse.json({ ok: true, items, credits: Math.max(0, credits - PROSPECT_CREDITS), charged: PROSPECT_CREDITS });
  } catch (e) {
    await refundCredits(supabase, user.id, PROSPECT_CREDITS);
    return NextResponse.json({ error: "falha", detail: e instanceof Error ? e.message : "erro na busca" }, { status: 502 });
  }
}
