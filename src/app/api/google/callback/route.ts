import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, fetchUserEmail, hasBusinessScope } from "@/lib/google/oauth";
import { listAccounts, listLocations } from "@/lib/google/business";

function back(path: string) {
  return NextResponse.redirect(new URL(path, process.env.APP_BASE_URL));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) return back(`/agendamento?error=${encodeURIComponent(err)}`);
  if (!code || !state) return back("/agendamento?error=sem_codigo");

  const cookieStore = await cookies();
  const expected = cookieStore.get("g_oauth_state")?.value;
  if (!expected || expected !== state) return back("/agendamento?error=estado_invalido");
  cookieStore.delete("g_oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return back("/entrar");

  try {
    const token = await exchangeCode(code);
    // Se o usuário não marcou a permissão do Perfil da Empresa, o token vem
    // sem o escopo e todas as chamadas dão 403. Avisa na hora, sem salvar quebrado.
    if (!hasBusinessScope(token.scope)) {
      return back("/agendamento?error=escopo_insuficiente");
    }
    const email = await fetchUserEmail(token.access_token);
    const expiry = new Date(Date.now() + token.expires_in * 1000).toISOString();

    await supabase.from("google_connections").upsert({
      user_id: user.id,
      google_email: email,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      token_expiry: expiry,
      scope: token.scope,
    });

    // Busca contas e locais e guarda para o compositor.
    try {
      const accounts = await listAccounts(token.access_token);
      for (const acc of accounts) {
        const locations = await listLocations(token.access_token, acc.name);
        for (const loc of locations) {
          const fullName = `${acc.name}/${loc.name}`; // accounts/x/locations/y
          const addr = loc.storefrontAddress;
          const address = addr
            ? [addr.addressLines?.join(", "), addr.locality, addr.administrativeArea]
                .filter(Boolean)
                .join(" - ")
            : null;
          await supabase.from("gmb_locations").upsert(
            {
              user_id: user.id,
              location_name: fullName,
              title: loc.title ?? null,
              address,
            },
            { onConflict: "user_id,location_name" },
          );
        }
      }
    } catch {
      // Sincronização de locais pode falhar (ex.: perfil sem locais acessíveis);
      // a conexão em si já foi salva.
    }

    return back("/agendamento?conectado=1");
  } catch (e) {
    const detail = e instanceof Error ? e.message : "desconhecido";
    return back(`/agendamento?error=falha_na_troca&detalhe=${encodeURIComponent(detail)}`);
  }
}
