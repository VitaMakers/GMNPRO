-- Acesso liberado manualmente pelo admin (cliente da agência, grátis até sair).
alter table public.subscriptions
  add column if not exists manual_access boolean not null default false;
