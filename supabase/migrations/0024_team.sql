-- Equipe/usuários da agência: o dono convida membros por e-mail; ao logar,
-- o membro é vinculado e passa a usar os perfis e o plano do dono.
create table if not exists public.team_members (
  owner_id uuid not null references auth.users (id) on delete cascade,
  member_email text not null,
  member_id uuid references auth.users (id) on delete set null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (owner_id, member_email)
);
create index if not exists team_members_member on public.team_members (member_id);
alter table public.team_members enable row level security;
-- Dono gerencia sua equipe; membro vê a própria linha.
create policy "owner manages team" on public.team_members
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "member reads own membership" on public.team_members
  for select using (auth.uid() = member_id);
