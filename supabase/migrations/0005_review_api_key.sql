-- Chave de IA própria do cliente (opcional). Se vazia, usa a chave do sistema.
alter table public.review_settings
  add column if not exists api_key text;
