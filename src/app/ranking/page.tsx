import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import RankingTool from "@/components/RankingTool";
import { getCredits } from "@/lib/credits";

export const metadata = { title: "Análise de Ranking — GMN Profile" };

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email, { meta: user.user_metadata });
  if (!access.allowed) redirect("/assinar");
  // Recurso exclusivo de agência — quem não é agência não acessa.
  if (!access.entitlements.geoGrid) redirect("/desempenho");

  const { data: locs } = await supabase
    .from("gmb_locations")
    .select("location_name, title")
    .order("title", { ascending: true });
  const locations = (locs as { location_name: string; title: string | null }[]) ?? [];
  const credits = await getCredits(supabase, user.id, access);

  return (
    <div className="min-h-screen">
      <AppHeader isAgency={access.entitlements.isAgency} isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Análise de Ranking</h1>
          <p className="mt-1 text-sm text-muted">
            Veja onde o perfil aparece no Google Maps em vários pontos da cidade — e descubra onde
            você domina e onde some.
          </p>
        </div>
        <RankingTool locations={locations} trial={access.trial} credits={credits} />
      </main>
    </div>
  );
}
