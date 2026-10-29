import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
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

  const { data: connection } = await supabase
    .from("google_connections")
    .select("google_email")
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
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
        />
      </main>
    </div>
  );
}
