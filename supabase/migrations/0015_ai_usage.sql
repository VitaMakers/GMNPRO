-- Controle de uso de IA por perfil/mês (ex.: limite de descrições geradas).
create table if not exists public.ai_usage (
  user_id uuid not null,
  location_name text not null,
  ym text not null,          -- ano-mês, ex.: "2026-11"
  kind text not null,        -- ex.: "description"
  count int not null default 0,
  primary key (user_id, location_name, ym, kind)
);
alter table public.ai_usage enable row level security;
create policy "own ai_usage" on public.ai_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
