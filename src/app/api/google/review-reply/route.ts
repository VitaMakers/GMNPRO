import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google/token";
import { postReviewReply } from "@/lib/google/reviews";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const { reviewName, comment } = (await request.json().catch(() => ({}))) as {
    reviewName?: string;
    comment?: string;
  };
  if (!reviewName || !comment?.trim()) {
    return NextResponse.json({ error: "faltam_dados" }, { status: 400 });
  }

  try {
    const token = await getValidAccessToken(supabase, user.id);
    await postReviewReply(token, reviewName, comment.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro ao publicar resposta" },
      { status: 502 },
    );
  }
}
