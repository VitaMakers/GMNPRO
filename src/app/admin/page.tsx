import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel Admin — GMN PRO" };

const PLAN_MONTHLY: Record<string, number> = { mensal: 20, anual: 225 / 12 };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

interface SubRow {
  user_id: string;
  status: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) redirect("/agendamento");

  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, status, plan, trial_ends_at, current_period_end");
  const subMap = new Map<string, SubRow>((subs as SubRow[] | null)?.map((s) => [s.user_id, s]) ?? []);

  const { count: perfis } = await admin
    .from("gmb_locations")
    .select("id", { count: "exact", head: true });

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersData?.users ?? [];

  const now = Date.now();
  type Row = {
    email: string;
    phone: string;
    created: string;
    categoria: string;
    rank: number;
    plano: string | null;
    valor: number;
  };
  const rows: Row[] = [];
  let emTeste = 0;
  let ativos = 0;
  let assinouTeste = 0;
  let semFechar = 0;
  let mrr = 0;

  for (const u of users) {
    const s = subMap.get(u.id);
    const status = s?.status ?? null;
    const plan = s?.plan ?? null;
    const trialEnds = s?.trial_ends_at ?? null;
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const phone = String(meta.phone ?? meta.whatsapp ?? "");
    let categoria = "";
    let rank = 5;
    let valor = 0;

    if (status === "active") {
      categoria = "Assinante ativo";
      rank = 4;
      ativos++;
      valor = PLAN_MONTHLY[plan ?? ""] ?? 0;
      mrr += valor;
    } else if (status === "trialing") {
      categoria = "Assinou (em teste)";
      rank = 3;
      assinouTeste++;
      valor = PLAN_MONTHLY[plan ?? ""] ?? 0;
    } else if (status === "past_due") {
      categoria = "Pagamento falhou";
      rank = 0;
      semFechar++;
    } else if (status === "canceled") {
      categoria = "Cancelou";
      rank = 1;
      semFechar++;
    } else if (trialEnds && new Date(trialEnds).getTime() > now) {
      categoria = "Em teste grátis";
      rank = 2;
      emTeste++;
    } else {
      categoria = "Teste expirado (não fechou)";
      rank = 0;
      semFechar++;
    }

    rows.push({ email: u.email ?? "", phone, created: u.created_at, categoria, rank, plano: plan, valor });
  }

  rows.sort((a, b) => a.rank - b.rank || +new Date(b.created) - +new Date(a.created));

  const cards = [
    { label: "Contas cadastradas", value: String(users.length) },
    { label: "Em teste grátis", value: String(emTeste) },
    { label: "Assinantes ativos", value: String(ativos) },
    { label: "Assinaram (em teste)", value: String(assinouTeste) },
    { label: "Perfis Google conectados", value: String(perfis ?? 0) },
    { label: "A cobrar (não fecharam)", value: String(semFechar) },
  ];

  const corCategoria = (c: string) =>
    c.startsWith("Assinante")
      ? "text-brand-2"
      : c.startsWith("Em teste") || c.startsWith("Assinou")
        ? "text-accent"
        : "text-red-400";

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Painel Admin</h1>
        <p className="mt-2 text-muted">Visão geral do negócio — testes, assinaturas e receita.</p>

        {/* Receita em destaque */}
        <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/5 p-6">
          <p className="text-sm text-muted">Receita recorrente mensal (MRR) — só de quem está pagando</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-brand-2">{brl(mrr)}</p>
          <p className="mt-1 text-xs text-muted">
            {ativos} assinante(s) ativo(s). (Quem está em teste ainda não entra no valor.)
          </p>
        </div>

        {/* Cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="mt-1 text-xs text-muted">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Contato (WhatsApp)</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor/mês</th>
                <th className="px-4 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.phone ? (
                      <a
                        href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-2 hover:underline"
                      >
                        {r.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium ${corCategoria(r.categoria)}`}>{r.categoria}</td>
                  <td className="px-4 py-3 text-muted">{r.plano ?? "—"}</td>
                  <td className="px-4 py-3">{r.valor ? brl(r.valor) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{dt(r.created)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Nenhuma conta ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          As pessoas em vermelho (teste expirado / cancelou / pagamento falhou) são as de contato
          prioritário para fechar a mensalidade.
        </p>
      </main>
    </div>
  );
}
