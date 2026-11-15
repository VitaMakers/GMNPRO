-- Sistema de afiliados: quem indica (afiliado), cliques no link e indicações.

-- Afiliado = uma conta já cadastrada com um código único.
create table if not exists public.affiliates (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.affiliates enable row level security;
create policy "own affiliate" on public.affiliates
  for select using (auth.uid() = user_id);

-- Cliques/visitas no link do afiliado (para monitorar o alcance).
create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  visitor text,              -- id anônimo (cookie) p/ deduplicar visitas
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_code_idx on public.affiliate_clicks (code);
create index if not exists affiliate_clicks_code_visitor_idx on public.affiliate_clicks (code, visitor);
alter table public.affiliate_clicks enable row level security;
-- O afiliado vê os próprios cliques; escrita só pelo servidor (service role).
create policy "affiliate reads own clicks" on public.affiliate_clicks
  for select using (
    exists (select 1 from public.affiliates a where a.user_id = auth.uid() and a.code = affiliate_clicks.code)
  );

-- Indicações: quem se cadastrou/pagou por um link.
create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  affiliate_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'signed_up',   -- 'signed_up' | 'paid'
  first_payment_cents integer,
  commission_cents integer,                    -- 20% do primeiro pagamento
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (referred_user_id)
);
create index if not exists affiliate_referrals_aff_idx on public.affiliate_referrals (affiliate_user_id);
alter table public.affiliate_referrals enable row level security;
create policy "affiliate reads own referrals" on public.affiliate_referrals
  for select using (auth.uid() = affiliate_user_id);
