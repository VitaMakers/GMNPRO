import { createAdminClient } from "@/lib/supabase/server";
import { BONUS_EVERY, COMMISSION_PCT } from "@/lib/affiliate";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DAY = 24 * 60 * 60 * 1000;

/** Situação do indicado: pagante, em teste (com dias) ou teste expirado. */
function situacao(
  referralPaid: boolean,
  sub: { status: string | null; trial_ends_at: string | null; manual_access?: boolean | null } | undefined,
): { label: string; tone: "green" | "amber" | "red" | "muted" } {
  if (referralPaid || sub?.status === "active" || sub?.manual_access) return { label: "Pagante ✓", tone: "green" };
  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
  const now = Date.now();
  if (trialEnds > now) {
    const dias = Math.ceil((trialEnds - now) / DAY);
    return { label: `Teste: ${dias} dia${dias === 1 ? "" : "s"}`, tone: dias <= 2 ? "amber" : "muted" };
  }
  if (trialEnds > 0) return { label: "Teste expirado", tone: "red" };
  return { label: "Cadastrado", tone: "muted" };
}

const toneClass: Record<string, string> = {
  green: "bg-brand/10 text-brand-2",
  amber: "bg-accent/15 text-accent",
  red: "bg-red-100 text-red-700",
  muted: "bg-surface-2 text-muted",
};

/** Painel admin: afiliados (resumo) + indicações (detalhe com dias de teste). */
export default async function AdminAffiliates() {
  const admin = createAdminClient();
  const { data: affs } = await admin
    .from("affiliates")
    .select("user_id, code, active, created_at")
    .order("created_at", { ascending: false });

  const affList = (affs as { user_id: string; code: string; active: boolean; created_at: string }[]) ?? [];

  // E-mail de cada afiliado.
  const affEmail = new Map<string, string>();
  await Promise.all(
    affList.map(async (a) => {
      const u = await admin.auth.admin.getUserById(a.user_id);
      affEmail.set(a.user_id, u.data?.user?.email ?? "—");
    }),
  );

  // Todas as indicações.
  const { data: refsData } = await admin
    .from("affiliate_referrals")
    .select("code, affiliate_user_id, referred_user_id, status, commission_cents, created_at")
    .order("created_at", { ascending: false });
  const refs = (refsData as {
    code: string;
    affiliate_user_id: string;
    referred_user_id: string;
    status: string;
    commission_cents: number | null;
    created_at: string;
  }[]) ?? [];

  // Assinatura (situação/teste) e e-mail de cada indicado.
  const referredIds = [...new Set(refs.map((r) => r.referred_user_id))];
  const subByUser = new Map<string, { status: string | null; trial_ends_at: string | null; manual_access?: boolean | null }>();
  const emailByUser = new Map<string, string>();
  if (referredIds.length > 0) {
    const { data: subs } = await admin
      .from("subscriptions")
      .select("user_id, status, trial_ends_at, manual_access")
      .in("user_id", referredIds);
    (subs as { user_id: string; status: string | null; trial_ends_at: string | null; manual_access: boolean | null }[] | null)?.forEach((s) =>
      subByUser.set(s.user_id, s),
    );
    await Promise.all(
      referredIds.map(async (id) => {
        const u = await admin.auth.admin.getUserById(id);
        emailByUser.set(id, u.data?.user?.email ?? "—");
      }),
    );
  }

  // Resumo por afiliado (inclui visitas e pessoas únicas do link).
  const resumo = await Promise.all(
    affList.map(async (a) => {
      const meus = refs.filter((r) => r.affiliate_user_id === a.user_id);
      const paid = meus.filter((r) => r.status === "paid");
      const commission = paid.reduce((s, r) => s + (r.commission_cents ?? 0), 0);
      const [clicks, clickRows] = await Promise.all([
        admin.from("affiliate_clicks").select("*", { count: "exact", head: true }).eq("code", a.code),
        admin.from("affiliate_clicks").select("visitor").eq("code", a.code).limit(5000),
      ]);
      const unique = new Set((clickRows.data ?? []).map((r) => (r as { visitor: string | null }).visitor).filter(Boolean)).size;
      return {
        code: a.code,
        email: affEmail.get(a.user_id) ?? "—",
        clicks: clicks.count ?? 0,
        unique,
        signups: meus.length,
        paid: paid.length,
        commission,
        bonuses: Math.floor(paid.length / BONUS_EVERY),
      };
    }),
  );

  return (
    <section>
      <h2 className="mb-1 mt-8 text-base font-semibold">Afiliados{resumo.length > 0 ? ` (${resumo.length})` : ""}</h2>
      <p className="mb-3 text-xs text-muted">
        Comissão de {Math.round(COMMISSION_PCT * 100)}% do 1º pagamento REAL (conta só depois do teste) + bônus a cada {BONUS_EVERY} pagantes.
        Para transformar uma conta em afiliado, use o botão <strong>“Afiliado”</strong> na tabela de contas acima.
      </p>

      {resumo.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-5 text-sm text-muted card-soft">
          Nenhum afiliado ainda. Clique em <strong>“Afiliado”</strong> na conta desejada para gerar o link.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-white card-soft">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Afiliado</th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Visitas</th>
                  <th className="px-4 py-3 font-medium">Pessoas</th>
                  <th className="px-4 py-3 font-medium">Cadastros</th>
                  <th className="px-4 py-3 font-medium">Pagantes</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                  <th className="px-4 py-3 font-medium">Bônus</th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((r) => (
                  <tr key={r.code} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3"><code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{r.code}</code></td>
                    <td className="px-4 py-3">{r.clicks}</td>
                    <td className="px-4 py-3">{r.unique}</td>
                    <td className="px-4 py-3">{r.signups}</td>
                    <td className="px-4 py-3 font-medium">{r.paid}</td>
                    <td className="px-4 py-3 font-semibold text-brand-2">{brl(r.commission)}</td>
                    <td className="px-4 py-3">{r.bonuses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalhe: cada indicado e quantos dias de teste ainda tem */}
          <h3 className="mb-2 mt-5 text-sm font-semibold">Indicações (situação de cada pessoa)</h3>
          <div className="overflow-x-auto rounded-2xl border border-border bg-white card-soft">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Indicado</th>
                  <th className="px-4 py-3 font-medium">Afiliado</th>
                  <th className="px-4 py-3 font-medium">Situação / teste</th>
                  <th className="px-4 py-3 font-medium">Entrou em</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {refs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">Ainda não há indicações.</td>
                  </tr>
                ) : (
                  refs.map((r, i) => {
                    const sit = situacao(r.status === "paid", subByUser.get(r.referred_user_id));
                    return (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">{emailByUser.get(r.referred_user_id) ?? "—"}</td>
                        <td className="px-4 py-3 text-muted">{affEmail.get(r.affiliate_user_id) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[sit.tone]}`}>{sit.label}</span>
                        </td>
                        <td className="px-4 py-3 text-muted">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 font-medium">{r.commission_cents ? brl(r.commission_cents) : "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
