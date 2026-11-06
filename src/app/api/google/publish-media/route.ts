import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { createMediaItem } from "@/lib/google/business";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  let body: { locationName?: string; mediaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const { locationName, mediaUrl } = body;
  if (!locationName || !mediaUrl) {
    return NextResponse.json({ error: "dados_incompletos" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);
    const created = await createMediaItem(accessToken, locationName, mediaUrl);
    return NextResponse.json({ ok: true, name: created.name });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
