/** Equipe: resolve o "dono da conta" de um usuário (ele mesmo, ou o dono se for membro). */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Usa o client admin para resolver o dono sem esbarrar em RLS. */
export async function resolveOwnerId(admin: SupabaseClient, userId: string, email?: string | null): Promise<string> {
  try {
    // Já vinculado?
    const { data } = await admin.from("team_members").select("owner_id").eq("member_id", userId).maybeSingle();
    if (data?.owner_id) return data.owner_id as string;
    // Convite pendente por e-mail? vincula agora.
    if (email) {
      const { data: inv } = await admin.from("team_members").select("owner_id").eq("member_email", email.toLowerCase()).is("member_id", null).maybeSingle();
      if (inv?.owner_id) {
        await admin.from("team_members").update({ member_id: userId }).eq("owner_id", inv.owner_id).eq("member_email", email.toLowerCase());
        return inv.owner_id as string;
      }
    }
  } catch { /* sem tabela: segue como dono */ }
  return userId;
}

export interface Member { member_email: string; member_id: string | null; role: string; created_at: string }

export async function listTeam(supabase: SupabaseClient, ownerId: string): Promise<Member[]> {
  const { data } = await supabase.from("team_members").select("member_email, member_id, role, created_at").eq("owner_id", ownerId).order("created_at");
  return (data as Member[]) ?? [];
}
