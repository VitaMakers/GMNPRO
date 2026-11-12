import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/google/oauth";
import { getAccess } from "@/lib/access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", process.env.APP_BASE_URL));

  // Primeiro escolher um plano (ou ter acesso) — só então liberar a conexão
  // com o Google. Sem plano, manda escolher.
  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) {
    return NextResponse.redirect(new URL("/assinar", process.env.APP_BASE_URL));
  }

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
    return NextResponse.redirect(
      new URL("/agendamento?error=oauth_nao_configurado", process.env.APP_BASE_URL),
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("g_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
