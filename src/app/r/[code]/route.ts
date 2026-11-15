import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { recordClick } from "@/lib/affiliate";

export const dynamic = "force-dynamic";

/**
 * Entrada do link de afiliado: /r/<codigo>
 * Registra a visita (para monitorar o alcance), guarda o código num cookie
 * (atribuição por 60 dias) e leva a pessoa para a página inicial.
 */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const base = process.env.APP_BASE_URL || new URL(request.url).origin;
  const dest = new URL("/?ref=1", base);
  const res = NextResponse.redirect(dest);

  if (!code) return res;

  const jar = await cookies();
  // Id anônimo do visitante (para contar pessoas, não só cliques).
  let vid = jar.get("gmn_vid")?.value ?? null;
  if (!vid) {
    vid = crypto.randomUUID();
    res.cookies.set("gmn_vid", vid, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax", path: "/" });
  }
  // Cookie de atribuição (quem indicou), 60 dias.
  res.cookies.set("gmn_ref", code, { maxAge: 60 * 60 * 24 * 60, httpOnly: true, sameSite: "lax", path: "/" });

  const referrer = request.headers.get("referer");
  await recordClick(createAdminClient(), code, vid, referrer);

  return res;
}
