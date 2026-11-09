-- Configurações de resposta de avaliações por perfil (palavras-chave, tom, IA).
create table if not exists public.review_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  business_name text,
  keywords text,                       -- palavras-chave do negócio (separadas por vírgula)
  tone text,                           -- instruções de tom/estilo de resposta
  signature text,                      -- assinatura (ex.: "Equipe Padaria X")
  provider text not null default 'claude',  -- 'claude' ou 'openai'
  updated_at timestamptz not null default now(),
  primary key (user_id, location_name)
);

alter table public.review_settings enable row level security;

create policy "own review settings" on public.review_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
