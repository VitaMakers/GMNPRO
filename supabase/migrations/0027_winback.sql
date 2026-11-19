-- Marca quando a mensagem de reengajamento (e-mail/WhatsApp) foi enviada
-- para quem testou e não assinou, evitando enviar mais de uma vez.
alter table public.subscriptions
  add column if not exists winback_sent_at timestamptz;
