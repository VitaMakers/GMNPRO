import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Força do perfil (leve): lê a ÚLTIMA Análise Completa já salva em
 * `audit_snapshots` e devolve só a nota + os itens, para desenhar o anel
 * no Desempenho sem rodar toda a auditoria de novo a cada carregamento.
 *
 * Se ainda não houver análise salva, devolve { score: null } e o card
 * mostra o botão "Analisar agora" (que chama /api/google/audit-profile).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const { data } = await supabase
      .from("audit_snapshots")
      .select("title, score, fraco, razoavel, bom, items, analyzed_at, profile")
      .eq("user_id", user.id)
      .eq("location_name", location)
      .maybeSingle();

    if (!data) return NextResponse.json({ score: null });

    const prof = (data.profile ?? {}) as { photoUrl?: string | null; address?: string; title?: string; verified?: boolean };
    return NextResponse.json({
      score: data.score ?? null,
      fraco: data.fraco ?? 0,
      razoavel: data.razoavel ?? 0,
      bom: data.bom ?? 0,
      items: Array.isArray(data.items) ? data.items : [],
      title: data.title ?? prof.title ?? "",
      address: prof.address ?? "",
      photoUrl: prof.photoUrl ?? null,
      verified: !!prof.verified,
      // Ficha completa da empresa (para o relatório).
      profile: data.profile ?? null,
      analyzed_at: data.analyzed_at ?? null,
    });
  } catch {
    // Tabela ausente ou erro de leitura: trata como "sem análise ainda".
    return NextResponse.json({ score: null });
  }
}
