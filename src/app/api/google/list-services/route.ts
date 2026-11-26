import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { getServiceItems } from "@/lib/google/business";

export const dynamic = "force-dynamic";

/** Serviços do perfil (serviceItems) — para o relatório. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);
    const services = await getServiceItems(accessToken, location);
    return NextResponse.json({ ok: true, total: services.length, items: services });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
