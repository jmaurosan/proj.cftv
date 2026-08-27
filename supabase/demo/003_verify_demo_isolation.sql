-- Deve ser executado autenticado como visitante no ambiente demo.
select public.user_client_role('d1000000-0000-4000-8000-000000000001'::uuid) as expected_viewer;
select count(*) as expected_one_client from public.clients;
select count(*) as expected_eight_cameras from public.cameras;
select count(*) as expected_two_recorders from public.dvrs;
select count(*) as expected_zero_credentials from public.credentials;

-- As operacoes abaixo DEVEM falhar por RLS quando executadas como visitante:
-- update public.clients set name = 'NAO DEVE ALTERAR' where id = 'd1000000-0000-4000-8000-000000000001';
-- delete from public.cameras where client_id = 'd1000000-0000-4000-8000-000000000001';
