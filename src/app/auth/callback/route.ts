import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { listAccounts, listLocations } from "@/lib/google/business";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const base = process.env.APP_BASE_URL ?? request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/entrar?error=sem_codigo", base));

  // A resposta de redirecionamento recebe os cookies da sessão.
  const response = NextResponse.redirect(new URL("/agendamento?conectado=1", base));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    const d = encodeURIComponent(error?.message ?? "sem_sessao");
    return NextResponse.redirect(new URL(`/entrar?error=login_google&d=${d}`, base));
  }

  const { session } = data;
  const user = session.user;
  const providerToken = session.provider_token;
  const providerRefresh = session.provider_refresh_token;

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
      // conexão salva; locais podem ser sincronizados depois
    }
  }

  return response;
}
