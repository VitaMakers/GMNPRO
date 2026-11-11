-- Foto/logo do perfil do Google por local (cache).
-- null = ainda não buscamos; '' = buscamos e não há; url = foto encontrada.
alter table public.gmb_locations
  add column if not exists photo_url text;
