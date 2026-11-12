import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/stripe";
import AdminGrantButton from "@/components/AdminGrantButton";
import AdminTierSelect from "@/components/AdminTierSelect";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import MetricChart from "@/components/MetricChart";
import { GRACE_DAYS } from "@/lib/access";

const DAY = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel Admin — GMN PRO" };

const PLAN_MONTHLY: Record<string, number> = { mensal: 20, anual: 225 / 12 };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

interface SubRow {
  user_id: string;
  status: string | null;
  plan: string | null;
  tier: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  manual_access: boolean | null;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) redirect("/desempenho");

  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, status, plan, tier, trial_ends_at, current_period_end, manual_access");
  const subMap = new Map<string, SubRow>((subs as SubRow[] | null)?.map((s) => [s.user_id, s]) ?? []);

  const { count: perfis } = await admin
    .from("gmb_locations")
    .select("id", { count: "exact", head: true });

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersData?.users ?? [];

  const { data: lostData } = await admin
    .from("lost_accounts")
    .select("email, phone, reason, tier, deleted_at")
    .order("deleted_at", { ascending: false })
    .limit(200);
  const lost =
    (lostData as { email: string | null; phone: string | null; reason: string | null; tier: string | null; deleted_at: string }[] | null) ?? [];

  const now = Date.now();
  type Row = {
    userId: string;
    email: string;
    phone: string;
    created: string;
    categoria: string;
    rank: number;
    plano: string | null;
    valor: number;
    manual: boolean;
    tier: string;
    periodEnd: string | null;
    deletionInDays: number | null;
    isAdmin: boolean;
  };
  const rows: Row[] = [];
  let emTeste = 0;
  let ativos = 0;
  let assinouTeste = 0;
  let semFechar = 0;
  let liberados = 0;
  let mrr = 0;
  let potencialTeste = 0;

  for (const u of users) {
    const s = subMap.get(u.id);
    const status = s?.status ?? null;
    const plan = s?.plan ?? null;
    const trialEnds = s?.trial_ends_at ?? null;
    const manual = s?.manual_access ?? false;
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const phone = String(meta.phone ?? meta.whatsapp ?? "");
    const effTier = (typeof meta.plan_tier === "string" ? meta.plan_tier : null) ?? s?.tier ?? "essencial";
    let categoria = "";
    let rank = 5;
    let valor = 0;

    if (manual) {
      categoria = "Liberado (agência)";
      rank = 2;
      liberados++;
    } else if (status === "active") {
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
      potencialTeste += valor;
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

    // Dias até a exclusão automática (só para expirados sem pagar).
    const isUserAdmin = !!u.email && ADMIN_EMAILS.includes(u.email.toLowerCase());
    let deletionInDays: number | null = null;
    if (categoria === "Teste expirado (não fechou)" && trialEnds && !isUserAdmin) {
      const deletionAt = new Date(trialEnds).getTime() + GRACE_DAYS * DAY;
      deletionInDays = Math.max(0, Math.ceil((deletionAt - now) / DAY));
    }

    rows.push({
      userId: u.id,
      email: u.email ?? "",
      phone,
      created: u.created_at,
      categoria,
      rank,
      plano: plan,
      valor,
      manual,
      tier: effTier,
      periodEnd: s?.current_period_end ?? null,
      deletionInDays,
      isAdmin: isUserAdmin,
    });
  }

  rows.sort((a, b) => a.rank - b.rank || +new Date(b.created) - +new Date(a.created));

  // Série de cadastros por dia (últimos 30 dias).
  const series: { date: string; value: number }[] = [];
  const dayCount = new Map<string, number>();
  for (const r of rows) {
    const key = new Date(r.created).toISOString().slice(0, 10);
    dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, value: dayCount.get(key) ?? 0 });
  }

  // Conversão para pago (donut): ativos vs em teste vs a cobrar.
  const pagantes = ativos;
  const testando = emTeste + assinouTeste;
  const convDen = pagantes + testando + semFechar;
  const convPct = convDen > 0 ? Math.round((pagantes / convDen) * 100) : 0;
  const previstoTotal = mrr + potencialTeste;

  // Próximas cobranças: quem paga/testa, por data de vencimento.
  const proximas = rows
    .filter((r) => (r.categoria.startsWith("Assinante") || r.categoria.startsWith("Assinou")) && r.periodEnd)
    .sort((a, b) => +new Date(a.periodEnd!) - +new Date(b.periodEnd!))
    .slice(0, 4);

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
      : c.startsWith("Liberado")
        ? "text-sky-500"
        : c.startsWith("Em teste") || c.startsWith("Assinou")
          ? "text-accent"
          : "text-red-500";

  // Donut (SVG estático) — conversão.
  const donutSegs = [
    { label: "Pagando", value: pagantes, color: "#059669" },
    { label: "Em teste", value: testando, color: "#d97706" },
    { label: "A cobrar", value: semFechar, color: "#ef4444" },
  ];
  const donutTotal = donutSegs.reduce((s, x) => s + x.value, 0);
  const R = 56;
  const SW = 20;
  const CIRC = 2 * Math.PI * R;
  let off = 0;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Painel Admin</h1>
          <p className="mt-1 text-sm text-muted">Visão geral do negócio — testes, assinaturas e receita.</p>
        </div>

        {/* Herói: MRR grande + card verde */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-white p-6 card-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Receita recorrente do mês (MRR)
            </p>
            <div className="mt-1 flex items-end gap-3">
              <p className="font-display text-5xl font-extrabold leading-none tracking-tight text-foreground sm:text-6xl">
                {brl(mrr)}
              </p>
              <span className="mb-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand-2">
                {ativos} ativo(s)
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Recebido/mês</p>
                <p className="mt-0.5 text-lg font-bold">{brl(mrr)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Potencial em teste</p>
                <p className="mt-0.5 text-lg font-bold text-accent">{brl(potencialTeste)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Previsto/mês</p>
                <p className="mt-0.5 text-lg font-bold text-brand-2">{brl(previstoTotal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Contas</p>
                <p className="mt-0.5 text-lg font-bold">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-3xl bg-brand-2 p-6 text-white card-soft">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold">R$</span>
                <div>
                  <p className="text-sm font-semibold">Resumo do mês</p>
                  <p className="text-xs text-white/70">Onde o negócio está</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/90">
                {ativos > 0
                  ? `Você tem ${ativos} assinante(s) ativo(s) gerando ${brl(mrr)}/mês. `
                  : "Ainda sem assinantes pagantes. "}
                {emTeste + assinouTeste > 0
                  ? `${emTeste + assinouTeste} em teste podem virar receita. `
                  : ""}
                {semFechar > 0 ? `${semFechar} pessoa(s) para reativar com contato.` : "Nenhuma conta parada no momento."}
              </p>
            </div>
            <p className="mt-5 text-xs text-white/70">{liberados} liberado(s) pela agência (não entram no MRR).</p>
          </div>
        </div>

        {/* 3 cards: cadastros/dia · conversão · próximas cobranças */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-white p-6 card-soft lg:col-span-1">
            <p className="text-sm font-semibold">Cadastros por dia</p>
            <p className="mb-3 text-xs text-muted">Novas contas nos últimos 30 dias</p>
            <MetricChart data={series} label="Cadastros por dia" />
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 card-soft">
            <p className="text-sm font-semibold">Conversão para pago</p>
            <p className="mb-4 text-xs text-muted">Pagando vs. em teste vs. a cobrar</p>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32 shrink-0">
                <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
                  {donutTotal === 0 ? (
                    <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth={SW} />
                  ) : (
                    donutSegs.map((s) => {
                      const len = (s.value / donutTotal) * CIRC;
                      const gap = len > 4 ? 2 : 0;
                      const seg = (
                        <circle key={s.label} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth={SW} strokeDasharray={`${Math.max(0, len - gap)} ${CIRC - Math.max(0, len - gap)}`} strokeDashoffset={-off} />
                      );
                      off += len;
                      return seg;
                    })
                  )}
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-2xl font-bold">{convPct}%</span>
                </div>
              </div>
              <ul className="w-full space-y-1.5">
                {donutSegs.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 text-xs text-muted">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 card-soft">
            <p className="text-sm font-semibold">Próximas cobranças</p>
            <p className="mb-4 text-xs text-muted">Vencimentos mais próximos</p>
            {proximas.length === 0 ? (
              <p className="mt-6 text-center text-xs text-muted">Nenhuma cobrança agendada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {proximas.map((r, i) => (
                  <li key={i} className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.email || "—"}</p>
                      <p className="text-xs text-muted">{r.plano ?? "—"} · vence {dt(r.periodEnd)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand-2">{r.valor ? brl(r.valor) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Fluxo do mês (cópia do layout de referência) */}
        <div className="mt-4 rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="text-sm font-semibold">Fluxo do mês</p>
          <p className="mb-5 text-xs text-muted">Receita ativa, potencial em teste e previsto do período.</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { label: "Receita ativa", value: mrr, color: "#059669", hint: `${ativos} assinante(s)` },
              { label: "Potencial em teste", value: potencialTeste, color: "#d97706", hint: `${assinouTeste} em teste pago` },
              { label: "Previsto total", value: previstoTotal, color: "#0ea5e9", hint: "se os testes fecharem" },
            ].map((col) => {
              const frac = previstoTotal > 0 ? Math.max(0.06, col.value / previstoTotal) : 0.06;
              const segs = Math.max(1, Math.round(frac * 10));
              return (
                <div key={col.label}>
                  <p className="text-xs uppercase tracking-wide text-muted">{col.label}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold tracking-tight">{brl(col.value)}</p>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: i < segs ? col.color : "var(--surface-2)" }}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{col.hint}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cards de métricas (detalhes) */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-white p-4 card-soft">
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="mt-1 text-xs text-muted">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabela completa (demais informações) */}
        <h2 className="mb-3 mt-8 text-base font-semibold">Todas as contas</h2>
        <div className="overflow-x-auto rounded-3xl border border-border bg-white card-soft">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Contato (WhatsApp)</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor/mês</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.phone ? (
                      <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-brand-2 hover:underline">
                        {r.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium ${corCategoria(r.categoria)}`}>
                    {r.categoria}
                    {r.deletionInDays !== null && (
                      <span className="mt-0.5 block text-[11px] font-normal text-red-500">
                        exclui em {r.deletionInDays} dia{r.deletionInDays === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{r.plano ?? "—"}</td>
                  <td className="px-4 py-3">{r.valor ? brl(r.valor) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{dt(r.created)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!r.isAdmin && <AdminTierSelect userId={r.userId} tier={r.tier} />}
                      <AdminGrantButton userId={r.userId} granted={r.manual} />
                      {!r.isAdmin && <AdminDeleteButton userId={r.userId} email={r.email} />}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">Nenhuma conta ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          As pessoas em vermelho (teste expirado / cancelou / pagamento falhou) são as de contato prioritário para fechar a mensalidade.
          Contas de teste expirado são <strong>excluídas automaticamente {GRACE_DAYS} dias</strong> após o fim do teste (o contato fica salvo abaixo).
        </p>

        {/* Contatos de contas excluídas (follow-up) */}
        <h2 className="mb-3 mt-8 text-base font-semibold">
          Contatos de contas excluídas{lost.length > 0 ? ` (${lost.length})` : ""}
        </h2>
        <p className="mb-3 text-xs text-muted">
          Guardamos email e WhatsApp mesmo após a exclusão, para você entender por que a pessoa não
          fechou e tentar recuperar.
        </p>
        <div className="overflow-x-auto rounded-3xl border border-border bg-white card-soft">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Contato (WhatsApp)</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Excluída em</th>
              </tr>
            </thead>
            <tbody>
              {lost.map((l, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-4 py-3">{l.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {l.phone ? (
                      <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-brand-2 hover:underline">
                        {l.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{l.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{l.tier ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{dt(l.deleted_at)}</td>
                </tr>
              ))}
              {lost.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">Nenhuma conta excluída ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
