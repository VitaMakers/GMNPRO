import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccessToken } from "./oauth";

/**
 * Devolve um access_token válido para o usuário, renovando pelo refresh_token
 * quando está perto de expirar. Atualiza o banco com o token novo.
 * Usa um cliente admin (service role) para ler/gravar a conexão.
 */
export async function getValidAccessToken(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  // Equipe: usa a conexão do DONO quando o usuário é membro.
  let accountId = userId;
  try {
    const { data: m } = await admin.from("team_members").select("owner_id").eq("member_id", userId).maybeSingle();
    if (m?.owner_id) accountId = m.owner_id as string;
  } catch { /* sem tabela: segue */ }

  const { data: conn, error } = await admin
    .from("google_connections")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", accountId)
    .maybeSingle();

  if (error || !conn) throw new Error("Conexão com o Google não encontrada.");

  const expiry = conn.token_expiry ? new Date(conn.token_expiry).getTime() : 0;
  const soon = Date.now() + 60_000; // renova se faltar menos de 1 min

  if (conn.access_token && expiry > soon) return conn.access_token;

  if (!conn.refresh_token) {
    // Sem refresh_token e token expirado: precisa reconectar.
    if (conn.access_token && expiry > Date.now()) return conn.access_token;
    throw new Error("Token expirado e sem refresh_token. Reconecte o Google.");
  }

  const refreshed = await refreshAccessToken(conn.refresh_token);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("google_connections")
    .update({
      access_token: refreshed.access_token,
      token_expiry: newExpiry,
    })
    .eq("user_id", accountId);

  return refreshed.access_token;
}
