import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { fetchProfilePhoto } from "@/lib/google/media";
import { getLocationGeo } from "@/lib/google/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface LocRow {
  location_name: string;
  title: string | null;
  photo_url: string | null;
  lat?: number | null;
  lng?: number | null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  // Tenta trazer coordenadas (coluna pode não existir se a migração 0016 não rodou).
  let data: LocRow[] | null = null;
  {
    const withCoords = await supabase
      .from("gmb_locations")
      .select("location_name, title, photo_url, lat, lng")
      .order("title", { ascending: true });
    if (withCoords.error) {
      const base = await supabase
        .from("gmb_locations")
        .select("location_name, title, photo_url")
        .order("title", { ascending: true });
      data = (base.data as LocRow[] | null) ?? null;
    } else {
      data = (withCoords.data as LocRow[] | null) ?? null;
    }
  }

  let locs = data ?? [];

  // Backfill das fotos ainda não buscadas (no máximo 6, para não travar a UI).
  const pending = locs.filter((l) => l.photo_url === null).slice(0, 6);
  if (pending.length > 0) {
    try {
      const admin = createAdminClient();
      const token = await getValidAccessToken(admin, user.id);
      const found = new Map<string, string>();
      await Promise.all(
        pending.map(async (l) => {
          try {
            const url = await fetchProfilePhoto(token, l.location_name);
            found.set(l.location_name, url); // "" quando não há
          } catch {
            found.set(l.location_name, "");
          }
        }),
      );
      // Grava o cache (url ou "" = já buscado).
      await Promise.all(
        [...found.entries()].map(([location_name, photo_url]) =>
          admin
            .from("gmb_locations")
            .update({ photo_url })
            .eq("user_id", user.id)
            .eq("location_name", location_name),
        ),
      );
      locs = locs.map((l) =>
        found.has(l.location_name) ? { ...l, photo_url: found.get(l.location_name)! } : l,
      );
    } catch {
      /* sem conexão Google / sem token: segue sem fotos */
    }
  }

  // Backfill de coordenadas (até 8 por chamada) para o Mapa de Locais.
  const noCoords = locs.filter((l) => l.lat == null || l.lng == null).slice(0, 8);
  if (noCoords.length > 0 && "lat" in (locs[0] ?? {})) {
    try {
      const admin = createAdminClient();
      const token = await getValidAccessToken(admin, user.id);
      const got = new Map<string, { lat: number; lng: number }>();
      await Promise.all(
        noCoords.map(async (l) => {
          try {
            const g = await getLocationGeo(token, l.location_name);
            if (g.lat != null && g.lng != null) got.set(l.location_name, { lat: g.lat, lng: g.lng });
          } catch {
            /* ignora */
          }
        }),
      );
      await Promise.all(
        [...got.entries()].map(([location_name, c]) =>
          admin.from("gmb_locations").update(c).eq("user_id", user.id).eq("location_name", location_name),
        ),
      );
      locs = locs.map((l) => (got.has(l.location_name) ? { ...l, ...got.get(l.location_name)! } : l));
    } catch {
      /* sem token: segue sem coordenadas */
    }
  }

  const profiles = locs.map((l) => ({
    location_name: l.location_name,
    title: l.title,
    photoUrl: l.photo_url && l.photo_url.length > 0 ? l.photo_url : null,
    lat: typeof l.lat === "number" ? l.lat : null,
    lng: typeof l.lng === "number" ? l.lng : null,
  }));

  return NextResponse.json({ profiles });
}
