import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Palavras-chave do negócio por perfil (reaproveita review_settings.keywords). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  const { data } = await supabase
    .from("review_settings")
    .select("keywords")
    .eq("location_name", location)
    .maybeSingle();

  return NextResponse.json({ ok: true, keywords: data?.keywords ?? "" });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { location, keywords } = (await request.json().catch(() => ({}))) as {
    location?: string;
    keywords?: string;
  };
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  // upsert só da coluna keywords: não mexe em tom/provedor/exemplos existentes.
  const { error } = await supabase
    .from("review_settings")
    .upsert(
      { user_id: user.id, location_name: location, keywords: keywords?.trim() || null },
      { onConflict: "user_id,location_name" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
