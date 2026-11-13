-- Agendamento de análises de ranking (acompanhamento automático).
create table if not exists public.ranking_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  keyword text not null,
  grid_size int not null,
  spacing_km numeric not null,
  frequency text not null default 'weekly',   -- weekly | monthly
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, location_name, keyword)
);
create index if not exists ranking_schedules_due on public.ranking_schedules (enabled, next_run_at);
alter table public.ranking_schedules enable row level security;
create policy "own ranking_schedules" on public.ranking_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
