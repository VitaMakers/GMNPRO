import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { runProfileAudit } from "@/lib/google/audit";

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
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao analisar o perfil" },
      { status: 502 },
    );
  }
}
