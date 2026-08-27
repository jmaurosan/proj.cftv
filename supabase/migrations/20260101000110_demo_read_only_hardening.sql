-- Execute apenas no Supabase exclusivo da demonstracao.
-- Corrige a policy historica de clients para respeitar owner/operator/viewer.
begin;

drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

create policy clients_select on public.clients for select
  using (public.user_has_client_role(id, array['owner','operator','viewer']));
create policy clients_insert on public.clients for insert
  with check (public.is_admin());
create policy clients_update on public.clients for update
  using (public.user_has_client_role(id, array['owner','operator']))
  with check (public.user_has_client_role(id, array['owner','operator']));
create policy clients_delete on public.clients for delete
  using (public.user_has_client_role(id, array['owner']));

commit;
notify pgrst, 'reload schema';
