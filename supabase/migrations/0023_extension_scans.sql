-- Resultados da pré-análise vindos da extensão do Chrome.
create table if not exists public.extension_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  report jsonb not null,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists extension_scans_user on public.extension_scans (user_id, created_at desc);
alter table public.extension_scans enable row level security;
create policy "own extension_scans" on public.extension_scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
