import { createAdminClient } from "@/lib/supabase/server";
import { BONUS_EVERY, COMMISSION_PCT } from "@/lib/affiliate";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Painel admin: lista os afiliados e o desempenho de cada um. */
export default async function AdminAffiliates() {
  const admin = createAdminClient();
  const { data: affs } = await admin
    .from("affiliates")
    .select("user_id, code, active, created_at")
    .order("created_at", { ascending: false });

  const list = (affs as { user_id: string; code: string; active: boolean; created_at: string }[]) ?? [];

  const rows = await Promise.all(
    list.map(async (a) => {
      const [clicks, clicksRows, refs, u] = await Promise.all([
        admin.from("affiliate_clicks").select("*", { count: "exact", head: true }).eq("code", a.code),
        admin.from("affiliate_clicks").select("visitor").eq("code", a.code).limit(5000),
        admin.from("affiliate_referrals").select("status, commission_cents").eq("affiliate_user_id", a.user_id),
        admin.auth.admin.getUserById(a.user_id),
      ]);
      const refList = (refs.data as { status: string; commission_cents: number | null }[]) ?? [];
      const paid = refList.filter((r) => r.status === "paid");
      const commission = paid.reduce((s, r) => s + (r.commission_cents ?? 0), 0);
      const unique = new Set((clicksRows.data ?? []).map((r) => (r as { visitor: string | null }).visitor).filter(Boolean)).size;
      return {
        code: a.code,
        email: u.data?.user?.email ?? "—",
        clicks: clicks.count ?? 0,
        unique,
        signups: refList.length,
        paid: paid.length,
        commission,
        bonuses: Math.floor(paid.length / BONUS_EVERY),
      };
    }),
  );

  return (
    <section>
      <h2 className="mb-1 mt-8 text-base font-semibold">Afiliados{rows.length > 0 ? ` (${rows.length})` : ""}</h2>
      <p className="mb-3 text-xs text-muted">
        Comissão de {Math.round(COMMISSION_PCT * 100)}% do 1º pagamento + bônus a cada {BONUS_EVERY} pagantes.
        Para transformar uma conta em afiliado, use o botão <strong>“Afiliado”</strong> na tabela de contas acima.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-5 text-sm text-muted card-soft">
          Nenhum afiliado ainda. Clique em <strong>“Afiliado”</strong> na conta desejada para gerar o link de indicação.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white card-soft">
          <table className="w-full min-w-[640px] text-sm">
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
              {rows.map((r) => (
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
      )}
    </section>
  );
}
