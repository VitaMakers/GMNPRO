import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listAccounts, listLocations } from "@/lib/google/business";

export const dynamic = "force-dynamic";

function back(path: string) {
  return NextResponse.redirect(new URL(path, process.env.APP_BASE_URL));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return back("/entrar?error=sem_codigo");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return back("/entrar?error=login_google");

  const session = data.session;
  const user = session.user;
  const providerToken = session.provider_token;
  const providerRefresh = session.provider_refresh_token;

  // Se veio token do Google (login com permissão do GMB), guarda a conexão.
  if (providerToken) {
    const expiry = new Date(Date.now() + 3300 * 1000).toISOString();
    await supabase.from("google_connections").upsert({
      user_id: user.id,
      google_email: user.email ?? null,
      access_token: providerToken,
      refresh_token: providerRefresh ?? null,
      token_expiry: expiry,
      scope: "https://www.googleapis.com/auth/business.manage",
    });

    try {
      const accounts = await listAccounts(providerToken);
      for (const acc of accounts) {
        const locations = await listLocations(providerToken, acc.name);
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
        }
      }
    } catch {
      // conexão salva; sincronização de locais pode ser refeita depois
    }
  }

  return back("/agendamento?conectado=1");
}
