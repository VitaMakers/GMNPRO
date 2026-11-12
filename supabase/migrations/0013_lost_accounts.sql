-- Contatos de contas excluídas (manual ou automático) — guardados para
-- follow-up e análise de por que a pessoa não fechou/pagou.
create table if not exists public.lost_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  phone text,
  reason text,
  tier text,
  trial_ended_at timestamptz,
  deleted_at timestamptz not null default now()
);

alter table public.lost_accounts enable row level security;
-- Sem políticas públicas: só o service role (painel admin) lê/escreve.
