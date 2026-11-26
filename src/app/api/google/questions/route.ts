import { NextResponse } from "next/server";
import { reportAuth } from "@/lib/reportAuth";
import { getValidAccessToken } from "@/lib/google/token";
import { listQuestions } from "@/lib/google/business";

export const dynamic = "force-dynamic";

/** Perguntas e respostas (Q&A) do perfil — seção Clientes do relatório. */
export async function GET(request: Request) {
  const auth = await reportAuth(request);
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const location = new URL(request.url).searchParams.get("location");
  if (!location) return NextResponse.json({ error: "sem_local" }, { status: 400 });

  try {
    const token = await getValidAccessToken(supabase, userId);
    const questions = await listQuestions(token, location);
    return NextResponse.json({ ok: true, total: questions.length, items: questions.slice(0, 12) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
