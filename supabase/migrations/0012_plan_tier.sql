-- Tier do plano (separa Essencial × Agência). Default: essencial.
alter table public.subscriptions
  add column if not exists tier text not null default 'essencial';

-- Assentos extras comprados (usuários adicionais além do incluso no plano).
alter table public.subscriptions
  add column if not exists extra_seats int not null default 0;
