-- Garante leitura dos documentos e mídias de projeto gravados antes da adoção
-- do caminho iniciado pelo user_id. Novos arquivos usam:
-- {user_id}/media/{client_id}/... e {user_id}/documents/{client_id}/...

drop policy if exists "Users can select own private backups" on storage.objects;

create policy "Users can select own private backups" on storage.objects
  for select to authenticated using (
    bucket_id = 'device-backups'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or (
        split_part(name, '/', 1) in ('documents', 'media')
        and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        and exists (
          select 1
          from public.clients
          where clients.id = split_part(name, '/', 2)::uuid
            and clients.user_id = auth.uid()
        )
      )
      or exists (
        select 1
        from public.device_backups
        where device_backups.file_path = storage.objects.name
          and device_backups.user_id = auth.uid()
      )
    )
  );
