import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import LocaisTool from "@/components/LocaisTool";

export const metadata = { title: "Gestão de Locais — GMN PRO" };

export default async function LocaisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) redirect("/assinar");
  if (!access.entitlements.isAgency) redirect("/desempenho");

  const [locsRes, { data: snaps }, { data: branding }] = await Promise.all([
    supabase.from("gmb_locations").select("location_name, title, photo_url, credit_cap").order("title", { ascending: true }),
    supabase.from("audit_snapshots").select("location_name, score, fraco, razoavel, bom, analyzed_at"),
    supabase.from("agency_branding").select("name, logo_url, color, phone, site").maybeSingle(),
  ]);
  // Coluna credit_cap pode não existir (migração 0022 não rodou): cai no básico.
  let locs = locsRes.data;
  if (locsRes.error) {
    const base = await supabase.from("gmb_locations").select("location_name, title, photo_url").order("title", { ascending: true });
    locs = (base.data as typeof locs) ?? [];
  }
  const byLoc = new Map((snaps ?? []).map((s) => [s.location_name, s]));
  const rows = (locs ?? []).map((l) => ({
    location_name: l.location_name,
    title: l.title,
    photoUrl: l.photo_url || null,
    creditCap: (l as { credit_cap?: number | null }).credit_cap ?? null,
    snap: byLoc.get(l.location_name) ?? null,
  }));

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Gestão de Locais</h1>
          <p className="mt-1 text-sm text-muted">Todos os perfis dos seus clientes num só painel: nota, pendências, relatório e link para o cliente.</p>
        </div>
        <LocaisTool rows={rows} branding={branding ?? null} />
      </main>
    </div>
  );
}
