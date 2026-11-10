-- Assinaturas e teste gratuito por usuário.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,                -- trialing, active, past_due, canceled, incomplete...
  plan text,                  -- mensal / anual
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Cada usuário lê/gera a própria linha; o webhook escreve via service role.
create policy "own subscription" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ao criar a conta, começa 7 dias de teste automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, trial_ends_at)
  values (new.id, now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
