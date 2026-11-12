-- Marca se a pessoa já escolheu um plano. Enquanto não escolher, não entra
-- no sistema (precisa escolher um plano para começar, mesmo o teste grátis).
alter table public.subscriptions
  add column if not exists plan_chosen boolean not null default false;

-- Backfill: contas que já existem continuam liberadas (não travar ninguém).
update public.subscriptions set plan_chosen = true where plan_chosen = false;
