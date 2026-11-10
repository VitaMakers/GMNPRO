import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AgendamentoDashboard from "@/components/AgendamentoDashboard";

export const metadata = {
  title: "Agendamento de Postagens — GMN PRO",
};

export default async function AgendamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const access = await getAccess(supabase, user.id, user.email);
  if (!access.allowed) redirect("/assinar");

  const { data: connection } = await supabase
    .from("google_connections")
    .select("google_email, access_token")
    .maybeSingle();

  const connected = !!connection?.access_token;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agendamento de Postagens</h1>
            <p className="mt-2 text-muted">
              Monte suas postagens, programe a data e deixe a publicação automática
              cuidar do resto.
            </p>
          </div>
        </div>
        <AgendamentoDashboard
          userEmail={user.email ?? ""}
          googleEmail={connection?.google_email ?? null}
          connected={connected}
        />
      </main>
    </div>
  );
}
