import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Autenticação das rotas de LEITURA usadas pelo relatório.
 *
 * - Normal: usuário logado (sessão).
 * - Link compartilhado (?share=<token>[&code=<código>]): quem abre não está
 *   logado. Validamos o token em `shared_reports` e liberamos somente a
 *   leitura do MESMO perfil para o qual o link foi criado, em nome de quem
 *   o criou. Token inexistente, código errado ou perfil diferente → negado.
 */
export async function reportAuth(
  request: Request,
): Promise<{ supabase: SupabaseClient; userId: string } | { error: NextResponse }> {
  const params = new URL(request.url).searchParams;
  const share = params.get("share");

  if (share) {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("shared_reports")
      .select("user_id, location_name, access_code")
      .eq("token", share)
      .maybeSingle();
    if (!row) return { error: NextResponse.json({ error: "link_invalido" }, { status: 404 }) };
    const need = String(row.access_code ?? "").trim();
    if (need && (params.get("code") ?? "").trim() !== need) {
      return { error: NextResponse.json({ error: "codigo_invalido" }, { status: 403 }) };
    }
    if (params.get("location") !== row.location_name) {
      return { error: NextResponse.json({ error: "perfil_nao_autorizado" }, { status: 403 }) };
    }
    return { supabase: admin, userId: row.user_id as string };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "nao_autenticado" }, { status: 401 }) };
  return { supabase, userId: user.id };
}
