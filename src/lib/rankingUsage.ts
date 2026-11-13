/** Créditos de ranking já usados por um perfil no mês corrente. */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function monthUsage(supabase: SupabaseClient, userId: string, location: string): Promise<number> {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("ranking_runs")
    .select("credits_used")
    .eq("user_id", userId)
    .eq("location_name", location)
    .gte("created_at", start.toISOString());
  return (data ?? []).reduce((s, r) => s + ((r as { credits_used?: number }).credits_used ?? 0), 0);
}
