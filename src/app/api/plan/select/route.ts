import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ENTITLEMENTS, type Tier } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

/**
 * Define o tier do plano do usuário SEM cobrança — para o período de teste.
 * Permite que a pessoa escolha "Agência" e já veja/experimente tudo do plano
 * durante os 7 dias grátis, antes de colocar cartão. A cobrança real continua
 * acontecendo pelo Stripe (checkout) para manter o acesso após o teste.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { tier } = (await request.json().catch(() => ({}))) as { tier?: Tier };
  if (!tier || !ENTITLEMENTS[tier]) {
    return NextResponse.json({ error: "plano_invalido" }, { status: 400 });
  }

  // Garante que exista a linha de assinatura (com teste) e atualiza o tier.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  // Não mexe no tier de quem já é pagante ativo (isso é feito pelo Stripe).
  if (existing?.status === "active") {
    return NextResponse.json({ error: "ja_assinante", detail: "Mude o plano pela gestão de assinatura." }, { status: 409 });
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert({ user_id: user.id, tier }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 });

  return NextResponse.json({ ok: true, tier });
}
