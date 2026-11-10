import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ allowed: false, trial: false, daysLeft: 0 }, { status: 401 });

  const access = await getAccess(supabase, user.id, user.email);
  return NextResponse.json(access);
}
