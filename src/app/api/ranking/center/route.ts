import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getValidAccessToken } from "@/lib/google/token";
import { locationCenter, isPlaceLocation } from "@/lib/rankingRun";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Centro da empresa para a pré-visualização da grade (pontos pretos no mapa),
 * ANTES de analisar. Não roda o geo-grid e não desconta créditos.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) return NextResponse.json({ error: "sem_acesso" }, { status: 403 });

  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const token = isPlaceLocation(location) ? null : await getValidAccessToken(supabase, user.id);
    const c = await locationCenter(supabase, user.id, token, location);
    if (c.lat == null || c.lng == null) return NextResponse.json({ error: "sem_coordenadas" }, { status: 404 });
    return NextResponse.json({ lat: c.lat, lng: c.lng, title: c.title });
  } catch {
    return NextResponse.json({ error: "falhou" }, { status: 500 });
  }
}
