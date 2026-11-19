-- Índices de performance em caminhos quentes.

-- O webhook do Stripe busca a assinatura por stripe_customer_id a cada evento
-- (pagamento, renovação, cancelamento). Sem índice, é varredura da tabela
-- inteira a cada cobrança. Com a base crescendo, este é o maior ganho.
create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);

-- O cron de resposta automática varre review_settings pelos perfis com
-- auto-resposta ligada. Índice parcial cobre exatamente esse filtro.
create index if not exists review_settings_autoreply_idx
  on public.review_settings (auto_reply_last_run)
  where auto_reply;
