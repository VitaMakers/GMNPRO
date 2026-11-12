-- Créditos de geo-grid (1 crédito = 1 ponto da grade) e histórico de análises.

-- Saldo de créditos por assinatura. credits_period = ano-mês da última
-- recarga (ex.: "2026-11"); quando muda o mês e o plano é pago, recarrega.
alter table public.subscriptions
  add column if not exists credits int not null default 0,
  add column if not exists credits_period text;

-- Histórico de análises de ranking (geo-grid).
create table if not exists public.ranking_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  keyword text not null,
  grid_size int not null,
  spacing_km numeric not null,
  center_lat double precision not null,
  center_lng double precision not null,
  points jsonb not null,          -- [{lat,lng,rank}] rank null = fora do top 20
  avg_rank numeric,
  top3_pct int,
  top10_pct int,
  credits_used int not null,
  created_at timestamptz not null default now()
);
create index if not exists ranking_runs_user_loc_idx
  on public.ranking_runs (user_id, location_name, created_at desc);
alter table public.ranking_runs enable row level security;
create policy "own ranking_runs" on public.ranking_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
