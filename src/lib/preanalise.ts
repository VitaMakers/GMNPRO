/** Limite mensal de pré-análises de terceiros (controle de custo), por conta. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Access } from "./access";

const KEY = "_preanalise";
const KIND = "preanalise";

export async function preAnaliseStatus(supabase: SupabaseClient, userId: string, access: Access): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = access.entitlements.preAnalyses ?? 0;
  const ym = new Date().toISOString().slice(0, 7);
  let used = 0;
  try {
    const { data } = await supabase.from("ai_usage").select("count").eq("user_id", userId).eq("location_name", KEY).eq("ym", ym).eq("kind", KIND).maybeSingle();
    used = (data as { count?: number } | null)?.count ?? 0;
  } catch { /* tabela ausente: não bloqueia */ return { allowed: true, used: 0, limit }; }
  return { allowed: used < limit, used, limit };
}

export async function countPreAnalise(supabase: SupabaseClient, userId: string): Promise<void> {
  const ym = new Date().toISOString().slice(0, 7);
  try {
    const { data } = await supabase.from("ai_usage").select("count").eq("user_id", userId).eq("location_name", KEY).eq("ym", ym).eq("kind", KIND).maybeSingle();
    await supabase.from("ai_usage").upsert(
      { user_id: userId, location_name: KEY, ym, kind: KIND, count: ((data as { count?: number } | null)?.count ?? 0) + 1 },
      { onConflict: "user_id,location_name,ym,kind" },
    );
  } catch { /* ignora */ }
}
