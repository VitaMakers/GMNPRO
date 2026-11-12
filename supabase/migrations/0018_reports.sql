-- Snapshots da Análise Completa, marca da agência (white-label) e links de relatório.

create table if not exists public.audit_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  title text,
  score int not null,
  fraco int not null default 0,
  razoavel int not null default 0,
  bom int not null default 0,
  items jsonb not null,        -- [{id,label,status,detail,tip,weight}]
  profile jsonb,               -- card do perfil
  analyzed_at timestamptz not null default now(),
  primary key (user_id, location_name)
);
alter table public.audit_snapshots enable row level security;
create policy "own audit_snapshots" on public.audit_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.agency_branding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  logo_url text,
  color text,
  phone text,
  site text,
  updated_at timestamptz not null default now()
);
alter table public.agency_branding enable row level security;
create policy "own agency_branding" on public.agency_branding
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.shared_reports (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  snapshot jsonb not null,
  branding jsonb,
  created_at timestamptz not null default now()
);
alter table public.shared_reports enable row level security;
create policy "own shared_reports" on public.shared_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Leitura pública é feita pelo servidor (service role) via token.
