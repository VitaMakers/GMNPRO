-- Compartilhamento do relatório: código de acesso no link público e
-- frequência (quinzenal/mensal) no envio automático por e-mail.

-- Código de acesso opcional no link público (quando preenchido, o link só
-- abre o relatório com o código correto).
alter table public.shared_reports
  add column if not exists access_code text;

-- Frequência do envio automático. 'monthly' mantém o comportamento atual;
-- 'biweekly' envia a cada ~14 dias. O campo booleano `monthly` segue
-- existindo (true = ativo) para compatibilidade com o cron atual.
alter table public.report_subscriptions
  add column if not exists frequency text not null default 'monthly';
