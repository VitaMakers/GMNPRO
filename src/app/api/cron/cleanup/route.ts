import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { runAccountCleanup } from "@/lib/accountCleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const qs = new URL(request.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // ?dry=1 só simula (não exclui) — útil para conferir antes de ligar.
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const result = await runAccountCleanup(admin, { dryRun });
  return NextResponse.json({ ok: true, ...result });
}
