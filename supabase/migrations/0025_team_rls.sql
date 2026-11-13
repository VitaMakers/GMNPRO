-- Membros da equipe acessam os dados do dono (leitura e, nas operacionais, ação).
-- Função auxiliar: o usuário é membro da equipe deste dono?
create or replace function public.is_team_member(owner uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members t where t.owner_id = owner and t.member_id = auth.uid());
$$;

-- Leitura dos dados do dono para os membros.
create policy "team read locations" on public.gmb_locations for select using (public.is_team_member(user_id));
create policy "team read connection" on public.google_connections for select using (public.is_team_member(user_id));
create policy "team read posts" on public.scheduled_posts for select using (public.is_team_member(user_id));
create policy "team read review_settings" on public.review_settings for select using (public.is_team_member(user_id));

-- Tabelas criadas nas migrações recentes (ignora se não existir).
do $$ begin
  if to_regclass('public.audit_snapshots') is not null then
    execute 'create policy "team read snapshots" on public.audit_snapshots for select using (public.is_team_member(user_id))';
  end if;
  if to_regclass('public.ranking_runs') is not null then
    execute 'create policy "team read ranking" on public.ranking_runs for select using (public.is_team_member(user_id))';
  end if;
  if to_regclass('public.score_history') is not null then
    execute 'create policy "team read score" on public.score_history for select using (public.is_team_member(user_id))';
  end if;
exception when duplicate_object then null; end $$;
