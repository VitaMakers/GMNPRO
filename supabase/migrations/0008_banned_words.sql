-- Palavras/expressões que a IA NÃO deve usar nas respostas.
alter table public.review_settings
  add column if not exists banned_words text;
