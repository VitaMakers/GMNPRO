import { NextResponse } from "next/server";
import { reportAuth } from "@/lib/reportAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await reportAuth(request);
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;
  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ history: [] });
  const { data, error } = await supabase
    .from("score_history")
    .select("score, analyzed_at")
    .eq("user_id", userId).eq("location_name", location)
    .order("analyzed_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ history: [] });
  return NextResponse.json({ history: (data ?? []).reverse() });
}
