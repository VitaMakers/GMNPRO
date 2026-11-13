import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { runProfileAudit } from "@/lib/google/audit";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const token = await getValidAccessToken(supabase, user.id);
    const result = await runProfileAudit(token, location);
    // Cacheia as coordenadas para o Mapa de Locais (best-effort).
    if (result.profile?.lat != null && result.profile?.lng != null) {
      try {
        await supabase
          .from("gmb_locations")
          .update({ lat: result.profile.lat, lng: result.profile.lng })
          .eq("user_id", user.id)
          .eq("location_name", location);
      } catch {
        /* coluna ausente: ignora */
      }
    }
    // Salva o snapshot (Gestão de Locais / relatórios) — best-effort.
    const snap = buildSnapshot(result.auto, result.profile);
    try {
      await supabase.from("audit_snapshots").upsert(
        {
          user_id: user.id,
          location_name: location,
          title: snap.title,
          score: snap.score,
          fraco: snap.fraco,
          razoavel: snap.razoavel,
          bom: snap.bom,
          items: snap.items,
          profile: snap.profile,
          analyzed_at: snap.analyzed_at,
        },
        { onConflict: "user_id,location_name" },
      );
    } catch {
      /* tabela ausente */
    }
    // Histórico da nota (append) — best-effort.
    try {
      await supabase.from("score_history").insert({
        user_id: user.id, location_name: location, score: snap.score,
        fraco: snap.fraco, razoavel: snap.razoavel, bom: snap.bom, analyzed_at: snap.analyzed_at,
      });
    } catch {
      /* tabela ausente */
    }
    return NextResponse.json({ ok: true, ...result, snapshot: snap });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao analisar o perfil" },
      { status: 502 },
    );
  }
}
