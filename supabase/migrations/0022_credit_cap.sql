-- Teto mensal de créditos de ranking por perfil (null = sem limite).
alter table public.gmb_locations
  add column if not exists credit_cap int;
