-- Guarda o valor REAL cobrado pelo Stripe na última fatura paga (em centavos),
-- já com qualquer desconto/cupom aplicado. O painel admin mostra este valor,
-- em vez de estimar pelo plano. Preenchido pelo webhook a cada pagamento.
alter table public.subscriptions
  add column if not exists price_cents integer;
