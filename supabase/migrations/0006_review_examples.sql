-- Exemplos de respostas do próprio cliente, para a IA aprender o tom dele.
alter table public.review_settings
  add column if not exists examples jsonb not null default '[]'::jsonb;
