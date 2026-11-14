import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import DesempenhoDashboard from "@/components/DesempenhoDashboard";

export const metadata = { title: "Desempenho — GMN Profile" };

export default async function DesempenhoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email, { meta: user.user_metadata });
  if (!access.allowed) redirect("/assinar");

  const { data: locs } = await supabase
    .from("gmb_locations")
    .select("location_name, title")
    .order("title", { ascending: true });
  const locations = (locs as { location_name: string; title: string | null }[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader isAgency={access.entitlements.isAgency} isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
      <main className="page-enter mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Desempenho</h1>
          <p className="mt-1 text-sm text-muted">
            Como seu perfil do Google vem crescendo — visualizações, ações e avaliações.
          </p>
        </div>
        {locations.length === 0 ? (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 text-sm text-muted">
            Conecte o Google e sincronize seus locais (em Agendamentos) para ver o desempenho.
          </div>
        ) : (
          <DesempenhoDashboard locations={locations} />
        )}
      </main>
    </div>
  );
}
