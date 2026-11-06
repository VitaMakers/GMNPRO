import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { listAccounts, listLocations } from "@/lib/google/business";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);
    const accounts = await listAccounts(accessToken);

    let count = 0;
    for (const acc of accounts) {
      const locations = await listLocations(accessToken, acc.name);
      for (const loc of locations) {
        const fullName = `${acc.name}/${loc.name}`;
        const addr = loc.storefrontAddress;
        const address = addr
          ? [addr.addressLines?.join(", "), addr.locality, addr.administrativeArea]
              .filter(Boolean)
              .join(" - ")
          : null;
        await supabase.from("gmb_locations").upsert(
          { user_id: user.id, location_name: fullName, title: loc.title ?? null, address },
          { onConflict: "user_id,location_name" },
        );
        count++;
      }
    }

    return NextResponse.json({ ok: true, count, accounts: accounts.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
