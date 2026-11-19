import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import CopyButton from "@/components/CopyButton";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { COMMISSION_PCT } from "@/lib/affiliate";

export const metadata = { title: "Programa de Afiliados — GMN Profile" };

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AfiliadoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [access, affRes] = await Promise.all([
    getAccess(supabase, user.id, user.email, { meta: user.user_metadata }),
    supabase.from("affiliates").select("code, active").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!access.allowed) redirect("/assinar");

  const header = (
    <AppHeader isAgency={access.entitlements.isAgency} isAdmin={access.status === "admin"} trial={access.trial ? { daysLeft: access.daysLeft } : null} />
  );

  const aff = affRes.data as { code: string; active: boolean } | null;

  if (!aff || !aff.active) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="page-enter mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Programa de Afiliados</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Sua conta ainda não faz parte do programa de afiliados. Fale com a equipe do GMN Profile
            para liberar o seu link de indicação e começar a ganhar comissões.
          </p>
        </main>
      </div>
    );
  }

  const code = aff.code;
  const base = process.env.APP_BASE_URL || "";
  const link = `${base}/r/${code}`;

  const [clicksCount, clicksRows, refsRes, commRes] = await Promise.all([
    supabase.from("affiliate_clicks").select("*", { count: "exact", head: true }).eq("code", code),
    supabase.from("affiliate_clicks").select("visitor").eq("code", code).limit(5000),
    supabase
      .from("affiliate_referrals")
      .select("referred_user_id, status, first_payment_cents, created_at, paid_at")
      .eq("affiliate_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select("referred_user_id, commission_cents")
      .eq("affiliate_user_id", user.id),
  ]);

  const totalClicks = clicksCount.count ?? 0;
  const uniqueVisitors = new Set((clicksRows.data ?? []).map((r) => (r as { visitor: string | null }).visitor).filter(Boolean)).size;
  const refs = (refsRes.data as { referred_user_id: string; status: string; first_payment_cents: number | null; created_at: string; paid_at: string | null }[]) ?? [];
  const signups = refs.length;
  const paid = refs.filter((r) => r.status === "paid");
  const paidCount = paid.length;

  // Comissão recorrente acumulada (extrato de todas as mensalidades pagas).
  const comm = (commRes.data as { referred_user_id: string; commission_cents: number | null }[]) ?? [];
  const commByReferred = new Map<string, number>();
  let commissionCents = 0;
  for (const c of comm) {
    commissionCents += c.commission_cents ?? 0;
    commByReferred.set(c.referred_user_id, (commByReferred.get(c.referred_user_id) ?? 0) + (c.commission_cents ?? 0));
  }

  const cards = [
    { label: "Visitas no link", value: totalClicks.toString(), hint: "cliques totais" },
    { label: "Pessoas (únicas)", value: uniqueVisitors.toString(), hint: "visitantes diferentes" },
    { label: "Cadastros", value: signups.toString(), hint: "entraram pelo link" },
    { label: "Clientes pagantes", value: paidCount.toString(), hint: "fizeram o 1º pagamento" },
  ];

  return (
    <div className="min-h-screen">
      {header}
      <main className="page-enter mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Programa de Afiliados</h1>
          <p className="mt-1 text-sm text-muted">
            Compartilhe seu link, acompanhe as visitas e ganhe comissão por cada cliente que assinar.
          </p>
        </div>

        {/* Link */}
        <div className="rounded-2xl border border-border bg-white p-5 card-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Seu link de indicação</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-surface-2 px-3 py-2 text-sm text-foreground">
              {link || `/r/${code}`}
            </code>
            <CopyButton text={link || `/r/${code}`} />
          </div>
          <p className="mt-2 text-xs text-muted">Envie esse link no grupo. Cada visita e cada cadastro aparecem aqui embaixo.</p>
        </div>

        {/* Métricas */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-white p-5 card-soft">
              <p className="text-xs font-medium text-muted">{c.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{c.value}</p>
              <p className="mt-1 text-xs text-muted">{c.hint}</p>
            </div>
          ))}
        </div>

        {/* Ganhos */}
        <div className="mt-5">
          <div className="rounded-2xl border border-brand-2/30 bg-brand/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-2">Comissão acumulada</p>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight text-brand-2">{brl(commissionCents)}</p>
            <p className="mt-1 text-xs text-muted">{Math.round(COMMISSION_PCT * 100)}% de cada mensalidade paga dos seus indicados (recorrente)</p>
          </div>
        </div>

        {/* Lista */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white card-soft">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Indicação</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">1º pagamento</th>
                <th className="px-4 py-3 font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {refs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">Ainda não há indicações. Compartilhe seu link! 🚀</td>
                </tr>
              ) : (
                refs.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      {r.status === "paid" ? (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-2">Pagante</span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">Cadastrado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.first_payment_cents ? brl(r.first_payment_cents) : "—"}</td>
                    <td className="px-4 py-3 font-medium">{(commByReferred.get(r.referred_user_id) ?? 0) > 0 ? brl(commByReferred.get(r.referred_user_id) ?? 0) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
