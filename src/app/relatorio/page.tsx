import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import RelatorioBuilder from "@/components/RelatorioBuilder";

export const metadata = { title: "Relatório — GMN Profile" };
export const dynamic = "force-dynamic";

export default async function RelatorioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email, { meta: user.user_metadata });
  if (!access.allowed) redirect("/assinar");
  // Recurso exclusivo de agência.
  if (!access.entitlements.isAgency) redirect("/desempenho");

  const { data: locs } = await supabase
    .from("gmb_locations")
    .select("location_name, title")
    .order("title", { ascending: true });
  const locations = (locs as { location_name: string; title: string | null }[]) ?? [];

  const { data: branding } = await supabase
    .from("agency_branding")
    .select("name, logo_url, color, phone, site")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <AppHeader isAgency isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
      </div>
      <main className="page-enter mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 print:hidden">
          <h1 className="font-display text-2xl font-bold tracking-tight">Relatório</h1>
          <p className="mt-1 text-sm text-muted">
            Monte o relatório com a <span className="font-medium text-foreground">sua marca</span> e envie ao cliente.
            Marque o que deve aparecer — a prévia monta ao vivo.
          </p>
        </div>
        <RelatorioBuilder locations={locations} initialBranding={branding ?? null} />
      </main>
    </div>
  );
}
