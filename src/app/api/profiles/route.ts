import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { fetchProfilePhoto } from "@/lib/google/media";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface LocRow {
  location_name: string;
  title: string | null;
  photo_url: string | null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { data } = await supabase
    .from("gmb_locations")
    .select("location_name, title, photo_url")
    .order("title", { ascending: true });

  let locs = (data as LocRow[] | null) ?? [];

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

  const profiles = locs.map((l) => ({
    location_name: l.location_name,
    title: l.title,
    photoUrl: l.photo_url && l.photo_url.length > 0 ? l.photo_url : null,
  }));

  return NextResponse.json({ profiles });
}
