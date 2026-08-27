-- Dados 100% ficticios para o Supabase exclusivo da demonstracao.
-- Antes de executar, crie e confirme no Auth os usuarios:
--   demo.admin@residencial-digixs.invalid
--   visitante@residencial-digixs.invalid
-- As senhas nunca devem ser inseridas neste arquivo.

do $$
declare
  v_owner_id uuid;
  v_viewer_id uuid;
  v_client_id constant uuid := 'd1000000-0000-4000-8000-000000000001';
  v_dvr_a constant uuid := 'd2000000-0000-4000-8000-000000000001';
  v_dvr_b constant uuid := 'd2000000-0000-4000-8000-000000000002';
  v_switch_a constant uuid := 'd3000000-0000-4000-8000-000000000001';
  v_balun_a constant uuid := 'd4000000-0000-4000-8000-000000000001';
  v_router_a constant uuid := 'd5000000-0000-4000-8000-000000000001';
  v_rack_a constant uuid := 'd6000000-0000-4000-8000-000000000001';
begin
  select id into v_owner_id from auth.users where lower(email) = 'demo.admin@residencial-digixs.invalid';
  select id into v_viewer_id from auth.users where lower(email) = 'visitante@residencial-digixs.invalid';
  if v_owner_id is null or v_viewer_id is null then
    raise exception 'Crie e confirme os dois usuarios ficticios do Auth antes de aplicar o seed.';
  end if;

  insert into public.clients (id, name, contact_name, contact_phone, contact_email, address, city, state, notes, user_id)
  values (v_client_id, 'RESIDENCIAL DIGIXS', 'Administracao ficticia', '(00) 00000-0000',
    'contato@residencial-digixs.invalid', 'Avenida Demonstracao, 1000', 'Cidade Exemplo', 'MS',
    jsonb_build_object('textNotes','Projeto demonstrativo com dados ficticios.')::text, v_owner_id)
  on conflict (id) do update set name = excluded.name, notes = excluded.notes;

  insert into public.client_members (user_id, client_id, role) values
    (v_owner_id, v_client_id, 'owner'), (v_viewer_id, v_client_id, 'viewer')
  on conflict (user_id, client_id) do update set role = excluded.role;

  insert into public.installation_sites (id, client_id, user_id, name, site_type, notes) values
    ('d1100000-0000-4000-8000-000000000001', v_client_id, v_owner_id, 'Portaria', 'portaria', 'Entrada principal'),
    ('d1100000-0000-4000-8000-000000000002', v_client_id, v_owner_id, 'Garagem', 'estacionamento', 'Subsolo ficticio'),
    ('d1100000-0000-4000-8000-000000000003', v_client_id, v_owner_id, 'Area de lazer', 'area_comum', 'Piscina e salao')
  on conflict (id) do update set name = excluded.name;

  insert into public.routers (id, name, brand, model, device_type, location, ip_address, status, notes, client_id, user_id)
  values (v_router_a, 'Roteador principal', 'MikroTik', 'RB750Gr3', 'mikrotik', 'Rack da portaria',
    '192.0.2.1', 'ativo', 'Endereco reservado para documentacao.', v_client_id, v_owner_id)
  on conflict (id) do update set name = excluded.name;

  insert into public.network_segments
    (id, name, description, network_ip, subnet_mask, gateway_ip, vlan_id, router_id, client_id, user_id, dhcp_start_ip, dhcp_end_ip)
  values
    ('d5100000-0000-4000-8000-000000000001', 'Rede CFTV demonstrativa',
     'Faixa reservada exclusivamente para documentacao e demonstracao.', '192.0.2.0',
     '255.255.255.0', '192.0.2.1', 20, v_router_a, v_client_id, v_owner_id,
     '192.0.2.150', '192.0.2.199')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    network_ip = excluded.network_ip,
    subnet_mask = excluded.subnet_mask,
    gateway_ip = excluded.gateway_ip,
    vlan_id = excluded.vlan_id,
    router_id = excluded.router_id,
    dhcp_start_ip = excluded.dhcp_start_ip,
    dhcp_end_ip = excluded.dhcp_end_ip;

  insert into public.switches (id, name, model, location, total_ports, is_poe, poe_standard, poe_budget_watts, status, notes, client_id, user_id)
  values (v_switch_a, 'Switch PoE principal', 'SW-16-POE-DEMO', 'Rack da portaria', 16,
    true, '802.3at', 180, 'ativo', 'Equipamento ficticio.', v_client_id, v_owner_id)
  on conflict (id) do update set name = excluded.name;

  insert into public.dvrs (id, name, ip_address, model, location, total_channels, analog_channels, ip_channels, operation_mode, status, notes, client_id, user_id) values
    (v_dvr_a, 'DVR Portaria', '192.0.2.20', 'DVR-8CH-DEMO', 'Rack da portaria', 8, 8, 0, 'dvr_only', 'ativo', 'Sem credenciais reais.', v_client_id, v_owner_id),
    (v_dvr_b, 'NVR Areas comuns', '192.0.2.21', 'NVR-8CH-DEMO', 'Rack da portaria', 8, 0, 8, 'nvr', 'ativo', 'Sem credenciais reais.', v_client_id, v_owner_id)
  on conflict (id) do update set name = excluded.name;

  insert into public.power_baluns (id, name, location, total_ports, status, notes, client_id, user_id)
  values (v_balun_a, 'Power Balun 8 canais', 'Rack da portaria', 8, 'ativo', 'Equipamento ficticio.', v_client_id, v_owner_id)
  on conflict (id) do update set name = excluded.name;

  insert into public.racks (id, topology_id, client_id, user_id, name, location, equipment_ids, has_nobreak, power_notes, cable_notes, notes)
  values (v_rack_a, 'rack-demo-portaria', v_client_id, v_owner_id, 'Rack principal', 'Portaria',
    array[v_router_a::text, v_switch_a::text, v_dvr_a::text, v_dvr_b::text, v_balun_a::text], true,
    'Nobreak demonstrativo de 1500 VA.', 'Cabos identificados por origem e destino.', 'Rack ficticio organizado.')
  on conflict (id) do update set name = excluded.name;

  insert into public.monitors (id, client_id, user_id, rack_id, name, brand, model, power_watts, input_voltage, location, status, notes)
  values ('d7000000-0000-4000-8000-000000000001', v_client_id, v_owner_id, v_rack_a,
    'Monitor da portaria', 'Marca Demo', 'MON-24-DEMO', 24, 'Bivolt', 'Portaria', 'ativo', 'Monitor ficticio.')
  on conflict (id) do update set name = excluded.name;

  insert into public.cameras (id, name, connection_type, dvr_id, channel_number, ip_address, poe_powered, location, type, status, resolution, balun_id, balun_port, switch_id, switch_port, notes, client_id, user_id) values
    ('d8000000-0000-4000-8000-000000000001','Entrada social','analogica',v_dvr_a,1,null,false,'Hall de entrada','dome','ativo','1080p',v_balun_a,1,null,null,'Camera ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000002','Portao de veiculos','analogica',v_dvr_a,2,null,false,'Acesso da garagem','bullet','ativo','1080p',v_balun_a,2,null,null,'Camera ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000003','Hall dos elevadores','analogica',v_dvr_a,3,null,false,'Hall social','dome','ativo','1080p',v_balun_a,3,null,null,'Camera ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000004','Garagem corredor A','analogica',v_dvr_a,4,null,false,'Garagem','bullet','ativo','1080p',v_balun_a,4,null,null,'Camera ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000005','Piscina panoramica','ip',v_dvr_b,1,'192.0.2.101',true,'Area de lazer','bullet','ativo','4MP',null,null,v_switch_a,1,'Camera IP ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000006','Salao de festas','ip',v_dvr_b,2,'192.0.2.102',true,'Area de lazer','dome','ativo','4MP',null,null,v_switch_a,2,'Camera IP ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000007','Playground','ip',v_dvr_b,3,'192.0.2.103',true,'Area de lazer','bullet','ativo','4MP',null,null,v_switch_a,3,'Camera IP ficticia.',v_client_id,v_owner_id),
    ('d8000000-0000-4000-8000-000000000008','Garagem panoramica','ip',v_dvr_b,4,'192.0.2.104',true,'Garagem','bullet','ativo','4MP',null,null,v_switch_a,4,'Camera IP ficticia.',v_client_id,v_owner_id)
  on conflict (id) do update set name = excluded.name;

  insert into public.dvr_channels (dvr_id, channel_number, is_active, notes, user_id, client_id)
  select dvr_id, channel_number, true, 'Canal demonstrativo', v_owner_id, v_client_id
  from (select v_dvr_a dvr_id, generate_series(1,8) channel_number union all select v_dvr_b, generate_series(1,8)) channels
  on conflict (dvr_id, channel_number) do update set is_active = excluded.is_active;
end $$;

notify pgrst, 'reload schema';
