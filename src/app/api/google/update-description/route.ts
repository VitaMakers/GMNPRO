import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { updateProfileDescription } from "@/lib/google/business";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { location, description } = (await request.json().catch(() => ({}))) as {
    location?: string;
    description?: string;
  };
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });
  if (typeof description !== "string") return NextResponse.json({ error: "sem_descricao" }, { status: 400 });
  if (description.length > 750) return NextResponse.json({ error: "muito_longa" }, { status: 400 });

  try {
    const token = await getValidAccessToken(supabase, user.id);
    await updateProfileDescription(token, location, description);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao publicar" },
      { status: 502 },
    );
  }
}
