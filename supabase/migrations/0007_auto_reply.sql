-- Resposta automática de avaliações novas (opcional, por perfil).
alter table public.review_settings
  add column if not exists auto_reply boolean not null default false;
alter table public.review_settings
  add column if not exists auto_reply_negatives boolean not null default false;
alter table public.review_settings
  add column if not exists auto_reply_last_run timestamptz;
