import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccessToken } from "./oauth";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

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

  // Tokens guardados cifrados (AES-256-GCM). decryptSecret devolve valores
  // antigos em texto puro como estão (compatibilidade).
  const accessToken = conn.access_token ? decryptSecret(conn.access_token) : null;
  const refreshToken = conn.refresh_token ? decryptSecret(conn.refresh_token) : null;

  const expiry = conn.token_expiry ? new Date(conn.token_expiry).getTime() : 0;
  const soon = Date.now() + 60_000; // renova se faltar menos de 1 min

  if (accessToken && expiry > soon) return accessToken;

  if (!refreshToken) {
    // Sem refresh_token e token expirado: precisa reconectar.
    if (accessToken && expiry > Date.now()) return accessToken;
    throw new Error("Token expirado e sem refresh_token. Reconecte o Google.");
  }

  const refreshed = await refreshAccessToken(refreshToken);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("google_connections")
    .update({
      access_token: encryptSecret(refreshed.access_token),
      token_expiry: newExpiry,
    })
    .eq("user_id", accountId);

  return refreshed.access_token;
}
