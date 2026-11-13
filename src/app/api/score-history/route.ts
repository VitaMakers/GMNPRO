import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ history: [] });
  const { data, error } = await supabase
    .from("score_history")
    .select("score, analyzed_at")
    .eq("user_id", user.id).eq("location_name", location)
    .order("analyzed_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ history: [] });
  return NextResponse.json({ history: (data ?? []).reverse() });
}
