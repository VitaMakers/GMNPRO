-- GMN PRO — esquema inicial para o módulo de agendamento de postagens.
-- Rode no SQL Editor do Supabase (em ordem).

-- Conexão do usuário com o Google (tokens OAuth). Acessada só no servidor.
create table if not exists public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Locais (perfis) do GMB que o usuário gerencia.
create table if not exists public.gmb_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,           -- ex.: accounts/123/locations/456
  title text,
  address text,
  created_at timestamptz not null default now(),
  unique (user_id, location_name)
);

-- Fila de postagens agendadas.
create type post_status as enum ('draft', 'scheduled', 'published', 'failed');
create type post_topic as enum ('STANDARD', 'EVENT', 'OFFER');

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  topic post_topic not null default 'STANDARD',
  summary text not null,
  cta_type text,                         -- ex.: LEARN_MORE, CALL, BOOK
  cta_url text,
  media_url text,                        -- URL pública da imagem (Storage)
  event_title text,
  event_start timestamptz,
  event_end timestamptz,
  scheduled_at timestamptz not null,
  status post_status not null default 'scheduled',
  published_at timestamptz,
  google_post_name text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_due
  on public.scheduled_posts (scheduled_at)
  where status = 'scheduled';

create index if not exists idx_posts_user
  on public.scheduled_posts (user_id, scheduled_at desc);

-- Row Level Security: cada usuário só enxerga o que é seu.
alter table public.google_connections enable row level security;
alter table public.gmb_locations enable row level security;
alter table public.scheduled_posts enable row level security;

create policy "own connections" on public.google_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own locations" on public.gmb_locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own posts" on public.scheduled_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atualiza updated_at automaticamente.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_posts_touch before update on public.scheduled_posts
  for each row execute function public.touch_updated_at();

create trigger trg_conn_touch before update on public.google_connections
  for each row execute function public.touch_updated_at();
