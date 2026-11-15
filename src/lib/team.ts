/** Equipe: resolve o "dono da conta" de um usuário (ele mesmo, ou o dono se for membro). */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Usa o client admin para resolver o dono sem esbarrar em RLS. */
export async function resolveOwnerId(admin: SupabaseClient, userId: string, email?: string | null): Promise<string> {
  try {
    const mail = email ? email.toLowerCase() : null;
    // As duas buscas são independentes → roda em paralelo (1 ida ao banco em vez de 2).
    const [byId, byEmail] = await Promise.all([
      admin.from("team_members").select("owner_id").eq("member_id", userId).maybeSingle(),
      mail
        ? admin.from("team_members").select("owner_id").eq("member_email", mail).is("member_id", null).maybeSingle()
        : Promise.resolve({ data: null as { owner_id?: string } | null }),
    ]);
    // Já vinculado?
    if (byId.data?.owner_id) return byId.data.owner_id as string;
    // Convite pendente por e-mail? vincula agora.
    if (mail && byEmail.data?.owner_id) {
      await admin.from("team_members").update({ member_id: userId }).eq("owner_id", byEmail.data.owner_id).eq("member_email", mail);
      return byEmail.data.owner_id as string;
    }
  } catch { /* sem tabela: segue como dono */ }
  return userId;
}

export interface Member { member_email: string; member_id: string | null; role: string; created_at: string }

export async function listTeam(supabase: SupabaseClient, ownerId: string): Promise<Member[]> {
  const { data } = await supabase.from("team_members").select("member_email, member_id, role, created_at").eq("owner_id", ownerId).order("created_at");
  return (data as Member[]) ?? [];
}
