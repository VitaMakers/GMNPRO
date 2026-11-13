import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "sem_id" }, { status: 400 });
  const { data } = await supabase.from("extension_scans").select("report, name, created_at, raw").eq("user_id", user.id).eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, ...data });
}
