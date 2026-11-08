import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import DesempenhoDashboard from "@/components/DesempenhoDashboard";

export const metadata = { title: "Desempenho — GMN PRO" };

export default async function DesempenhoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: locs } = await supabase
    .from("gmb_locations")
    .select("location_name, title")
    .order("title", { ascending: true });
  const locations = (locs as { location_name: string; title: string | null }[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Desempenho</h1>
          <p className="mt-2 text-muted">
            Evolução do seu perfil no Google: visualizações, ações e avaliações, com
            comparação de crescimento por período.
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
