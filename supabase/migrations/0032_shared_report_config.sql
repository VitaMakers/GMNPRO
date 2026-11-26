-- Link do relatório "ao vivo": guarda a configuração escolhida pela agência
-- (seções, sub-opções, textos, período). Com ela, a página pública monta o
-- mesmo relatório do construtor buscando os dados atuais do Google a cada
-- abertura. Links antigos (config nulo) continuam mostrando a cópia salva.
alter table public.shared_reports
  add column if not exists config jsonb;
