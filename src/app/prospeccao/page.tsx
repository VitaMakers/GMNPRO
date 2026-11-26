import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getCredits } from "@/lib/credits";
import { PROSPECT_CREDITS } from "@/lib/dataforseo";
import ProspeccaoTool from "@/components/ProspeccaoTool";

export const metadata = { title: "Prospecção — GMN Profile" };

export default async function ProspeccaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email, { meta: user.user_metadata });
  if (!access.allowed) redirect("/assinar");
  // Recurso exclusivo de agência.
  if (!access.entitlements.geoGrid) redirect("/desempenho");
  const credits = await getCredits(supabase, user.id, access);

  return (
    <div className="min-h-screen">
      <AppHeader isAgency={access.entitlements.isAgency} isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
      <main className="page-enter mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Prospecção</h1>
          <p className="mt-1 text-sm text-muted">
            Encontre empresas de um segmento em uma cidade, com telefone, endereço, site e avaliações — e exporte a lista para prospectar.
          </p>
        </div>
        <ProspeccaoTool credits={credits} cost={PROSPECT_CREDITS} />
      </main>
    </div>
  );
}
