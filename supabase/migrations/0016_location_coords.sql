-- Coordenadas do local (cache), para o Mapa de Locais da Análise Completa.
-- Preenchidas quando o perfil é analisado (lidas do Google Business Profile).
alter table public.gmb_locations
  add column if not exists lat double precision,
  add column if not exists lng double precision;
