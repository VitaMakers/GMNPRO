import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import TeamTool from "@/components/TeamTool";

export const metadata = { title: "Equipe — GMN Profile" };

export default async function EquipePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const access = await getAccess(supabase, user.id, user.email, { meta: user.user_metadata });
  if (!access.allowed) redirect("/assinar");
  if (!access.entitlements.isAgency) redirect("/desempenho");

  return (
    <div className="min-h-screen">
      <AppHeader isAgency={access.entitlements.isAgency} isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
      <main className="page-enter mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="mt-1 text-sm text-muted">Convide usuários para acessar os perfis da sua agência. Eles entram com o próprio login e herdam o seu plano.</p>
        </div>
        {access.isMember ? (
          <div className="rounded-3xl border border-border bg-white p-6 text-sm card-soft">
            Sua conta é <strong>membro</strong> de uma equipe — você já acessa os perfis e o plano do dono. A gestão da equipe é feita pelo dono da conta.
          </div>
        ) : (
          <TeamTool />
        )}
      </main>
    </div>
  );
}
