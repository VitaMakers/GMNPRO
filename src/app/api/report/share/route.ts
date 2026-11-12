import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Cria um link público do relatório (snapshot mais recente do perfil). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const { location } = (await request.json().catch(() => ({}))) as { location?: string };
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const [{ data: snap }, { data: branding }] = await Promise.all([
    supabase.from("audit_snapshots").select("*").eq("user_id", user.id).eq("location_name", location).maybeSingle(),
    supabase.from("agency_branding").select("name, logo_url, color, phone, site").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!snap) return NextResponse.json({ error: "sem_analise", detail: "Analise o perfil primeiro." }, { status: 404 });

  const token = randomBytes(9).toString("base64url");
  const { error } = await supabase.from("shared_reports").insert({
    token, user_id: user.id, location_name: location, snapshot: snap, branding: branding ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  return NextResponse.json({ ok: true, token, url: `${base}/relatorio/${token}` });
}
