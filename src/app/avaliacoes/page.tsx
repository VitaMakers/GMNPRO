import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import AvaliacoesDashboard from "@/components/AvaliacoesDashboard";

export const metadata = { title: "Avaliações — GMN PRO" };

export default async function AvaliacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: connection } = await supabase
    .from("google_connections")
    .select("access_token")
    .maybeSingle();
  const connected = !!connection?.access_token;

  const { data: locs } = await supabase
    .from("gmb_locations")
    .select("location_name, title")
    .order("title", { ascending: true });
  const locations = (locs as { location_name: string; title: string | null }[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Avaliações com IA</h1>
          <p className="mt-2 text-muted">
            A IA gera respostas personalizadas para as avaliações do seu Google — citando o
            nome da pessoa e usando as palavras-chave do seu negócio. Você revisa e envia.
            Avaliações negativas vêm só como sugestão, para você aprovar.
          </p>
        </div>
        {!connected || locations.length === 0 ? (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 text-sm text-muted">
            Conecte o Google e sincronize seus perfis (na aba <span className="font-medium text-foreground">Agendamentos</span>)
            para responder as avaliações.
          </div>
        ) : (
          <AvaliacoesDashboard locations={locations} />
        )}
      </main>
    </div>
  );
}
