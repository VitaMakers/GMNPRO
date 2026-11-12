"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleG } from "@/components/GoogleBadge";

export default function MinimalHeader() {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">
            GMN <span className="text-brand-2">PRO</span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted sm:inline-flex">
            <GoogleG className="h-3.5 w-3.5" />
            API oficial
          </span>
        </div>
        <button
          onClick={sair}
          className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-foreground"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
