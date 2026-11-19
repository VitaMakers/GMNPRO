-- Comissão recorrente: 10% de CADA mensalidade paga do indicado.
-- Uma linha por fatura paga (idempotente por invoice_id).
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  invoice_id text unique,                   -- idempotência: 1 comissão por fatura do Stripe
  amount_cents integer not null,            -- mensalidade paga
  commission_cents integer not null,        -- 10% da mensalidade
  month_index integer not null default 1,   -- 1, 2, 3... (ordem das mensalidades)
  created_at timestamptz not null default now()
);
create index if not exists affiliate_commissions_aff_idx on public.affiliate_commissions (affiliate_user_id);
create index if not exists affiliate_commissions_ref_idx on public.affiliate_commissions (referred_user_id);
alter table public.affiliate_commissions enable row level security;
-- O afiliado lê as próprias comissões; escrita só pelo servidor (service role).
create policy "affiliate reads own commissions" on public.affiliate_commissions
  for select using (auth.uid() = affiliate_user_id);
