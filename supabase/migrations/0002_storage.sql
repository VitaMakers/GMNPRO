-- Bucket público para as imagens das postagens.
-- A API do Google exige a imagem por URL público, por isso o bucket é público
-- para leitura. A escrita é restrita ao dono (via RLS abaixo).

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post-media public read"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "post-media owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post-media owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
