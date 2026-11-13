-- Histórico da nota da Análise Completa (append: uma linha por análise).
create table if not exists public.score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  score int not null,
  fraco int not null default 0,
  razoavel int not null default 0,
  bom int not null default 0,
  analyzed_at timestamptz not null default now()
);
create index if not exists score_history_idx on public.score_history (user_id, location_name, analyzed_at desc);
alter table public.score_history enable row level security;
create policy "own score_history" on public.score_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
