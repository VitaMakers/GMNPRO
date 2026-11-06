-- Permite agendar FOTOS para a galeria do perfil, reaproveitando a fila.
-- 'kind' separa postagem (localPost) de foto (media da galeria).

alter table public.scheduled_posts
  add column if not exists kind text not null default 'post';

-- Para fotos, o texto (summary) é opcional.
alter table public.scheduled_posts
  alter column summary drop not null;
