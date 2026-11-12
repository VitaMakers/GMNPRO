-- Envio de relatório por e-mail ao cliente (manual e mensal automático).
create table if not exists public.report_subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  email text not null,
  monthly boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, location_name)
);
alter table public.report_subscriptions enable row level security;
create policy "own report_subscriptions" on public.report_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
