-- ============================================
-- VERIFICAÇÃO E CRIAÇÃO DE TODAS AS TABELAS DO CFTV
-- Execute este SQL no projeto CFTV (não no PrecificaPro!)
-- ============================================

-- Verifica se schema principal existe
SELECT 'Verificando tabelas principais...' as status;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Schema base: dvrs
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'dvrs';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela dvrs não existe - criando...';
    EXECUTE '
      CREATE TABLE dvrs (
        id uuid primary key default gen_random_uuid(),
        name varchar(100) not null,
        ip_address varchar(45) not null,
        brand varchar(100),
        model varchar(100),
        location varchar(200) not null,
        total_channels smallint not null default 8,
        status varchar(20) not null default ''ativo'',
        username varchar(100),
        password varchar(255),
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )';
    ALTER TABLE dvrs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "dvrs_select" ON dvrs FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "dvrs_insert" ON dvrs FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "dvrs_update" ON dvrs FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "dvrs_delete" ON dvrs FOR DELETE USING (auth.uid() = user_id);
    CREATE INDEX idx_dvrs_user_id ON dvrs(user_id);
  ELSE
    RAISE NOTICE 'Tabela dvrs ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Schema base: power_baluns
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'power_baluns';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela power_baluns não existe - criando...';
    EXECUTE '
      CREATE TABLE power_baluns (
        id uuid primary key default gen_random_uuid(),
        name varchar(100) not null,
        location varchar(200) not null,
        total_ports smallint not null default 4,
        status varchar(20) not null default ''ativo'',
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )';
    ALTER TABLE power_baluns ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "baluns_select" ON power_baluns FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "baluns_insert" ON power_baluns FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "baluns_update" ON power_baluns FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "baluns_delete" ON power_baluns FOR DELETE USING (auth.uid() = user_id);
    CREATE INDEX idx_baluns_user_id ON power_baluns(user_id);
  ELSE
    RAISE NOTICE 'Tabela power_baluns ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Schema base: switches
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'switches';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela switches não existe - criando...';
    EXECUTE '
      CREATE TABLE switches (
        id uuid primary key default gen_random_uuid(),
        name varchar(100) not null,
        ip_address varchar(45) not null,
        brand varchar(100),
        model varchar(100),
        location varchar(200) not null,
        total_ports smallint not null default 8,
        is_poe boolean not null default false,
        poe_standard varchar(20),
        poe_budget_watts numeric(6,1),
        status varchar(20) not null default ''ativo'',
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )';
    ALTER TABLE switches ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "switches_select" ON switches FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "switches_insert" ON switches FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "switches_update" ON switches FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "switches_delete" ON switches FOR DELETE USING (auth.uid() = user_id);
    CREATE INDEX idx_switches_user_id ON switches(user_id);
  ELSE
    RAISE NOTICE 'Tabela switches ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Schema base: cameras
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'cameras';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela cameras não existe - criando...';
    EXECUTE '
      CREATE TABLE cameras (
        id uuid primary key default gen_random_uuid(),
        name varchar(100) not null,
        connection_type varchar(20) not null default ''analogica'',
        brand varchar(100),
        dvr_id uuid references dvrs(id) on delete cascade,
        channel_number smallint,
        ip_address varchar(45),
        mac_address varchar(17),
        poe_powered boolean not null default false,
        location varchar(200) not null,
        type varchar(30) not null default ''dome'',
        status varchar(20) not null default ''ativo'',
        resolution varchar(20) default ''1080p'',
        rtsp_url varchar(500),
        balun_id uuid references power_baluns(id) on delete set null,
        balun_port smallint,
        switch_id uuid references switches(id) on delete set null,
        switch_port smallint,
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )';
    ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "cameras_select" ON cameras FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "cameras_insert" ON cameras FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "cameras_update" ON cameras FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "cameras_delete" ON cameras FOR DELETE USING (auth.uid() = user_id);
    CREATE INDEX idx_cameras_user_id ON cameras(user_id);
  ELSE
    RAISE NOTICE 'Tabela cameras ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Schema base: credentials
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'credentials';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela credentials não existe - criando...';
    EXECUTE '
      CREATE TABLE credentials (
        id uuid primary key default gen_random_uuid(),
        device_type varchar(20) not null,
        device_id uuid,
        label varchar(100) not null,
        username varchar(100) not null,
        password varchar(255) not null,
        ip_address varchar(45),
        port integer,
        protocol varchar(20) default ''http'',
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )';
    ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "credentials_select" ON credentials FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "credentials_insert" ON credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "credentials_update" ON credentials FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "credentials_delete" ON credentials FOR DELETE USING (auth.uid() = user_id);
    CREATE INDEX idx_credentials_user_id ON credentials(user_id);
  ELSE
    RAISE NOTICE 'Tabela credentials ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Schema base: cable_connections
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'cable_connections';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela cable_connections não existe - criando...';
    EXECUTE '
      CREATE TABLE cable_connections (
        id uuid primary key default gen_random_uuid(),
        camera_id uuid not null references cameras(id) on delete cascade,
        cable_type varchar(30) not null,
        wiring_standard varchar(20),
        custom_color_order text,
        pair1_function varchar(20) default ''dados'',
        pair1_colors varchar(50) default ''Azul / Branco-Azul'',
        pair2_function varchar(20) default ''dados'',
        pair2_colors varchar(50) default ''Laranja / Branco-Laranja'',
        pair3_function varchar(20) default ''dados'',
        pair3_colors varchar(50) default ''Verde / Branco-Verde'',
        pair4_function varchar(20) default ''dados'',
        pair4_colors varchar(50) default ''Marrom / Branco-Marrom'',
        has_splice boolean default false,
        splice_location varchar(200),
        splice_notes text,
        has_external_power boolean default false,
        power_source_info text,
        cable_length_meters numeric(6,1),
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )';
    ALTER TABLE cable_connections ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "cable_select" ON cable_connections FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "cable_insert" ON cable_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "cable_update" ON cable_connections FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "cable_delete" ON cable_connections FOR DELETE USING (auth.uid() = user_id);
    CREATE INDEX idx_cable_user_id ON cable_connections(user_id);
  ELSE
    RAISE NOTICE 'Tabela cable_connections ja existe';
  END IF;
END $$;

-- Tabelas extras
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'equipment_models';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela equipment_models não existe - criando...';
    EXECUTE '
      CREATE TABLE equipment_models (
        id uuid primary key default gen_random_uuid(),
        type varchar(20) not null check (type in (''camera'', ''dvr'', ''switch'', ''balun'', ''router'', ''other'')),
        brand varchar(100) not null,
        model varchar(100) not null,
        resolution varchar(20),
        channel_count int,
        poe_standard varchar(20),
        max_ports int,
        is_poe boolean default false,
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(type, brand, model, user_id)
      )';
    ALTER TABLE equipment_models ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "equipment_models_select" ON equipment_models FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "equipment_models_insert" ON equipment_models FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "equipment_models_update" ON equipment_models FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "equipment_models_delete" ON equipment_models FOR DELETE USING (auth.uid() = user_id);
  ELSE
    RAISE NOTICE 'Tabela equipment_models ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'balun_ports';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela balun_ports não existe - criando...';
    EXECUTE '
      CREATE TABLE balun_ports (
        id uuid primary key default gen_random_uuid(),
        balun_id uuid not null references power_baluns(id) on delete cascade,
        port_number int not null,
        camera_id uuid references cameras(id) on delete set null,
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(balun_id, port_number)
      )';
    ALTER TABLE balun_ports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "balun_ports_select" ON balun_ports FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "balun_ports_insert" ON balun_ports FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "balun_ports_update" ON balun_ports FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "balun_ports_delete" ON balun_ports FOR DELETE USING (auth.uid() = user_id);
  ELSE
    RAISE NOTICE 'Tabela balun_ports ja existe';
  END IF;
END $$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_name = 'switch_ports';
  IF v_count = 0 THEN
    RAISE NOTICE 'Tabela switch_ports não existe - criando...';
    EXECUTE '
      CREATE TABLE switch_ports (
        id uuid primary key default gen_random_uuid(),
        switch_id uuid not null references switches(id) on delete cascade,
        port_number int not null,
        device_type varchar(20),
        device_id uuid,
        device_name varchar(200),
        notes text,
        user_id uuid not null references auth.users(id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(switch_id, port_number)
      )';
    ALTER TABLE switch_ports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "switch_ports_select" ON switch_ports FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "switch_ports_insert" ON switch_ports FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "switch_ports_update" ON switch_ports FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "switch_ports_delete" ON switch_ports FOR DELETE USING (auth.uid() = user_id);
  ELSE
    RAISE NOTICE 'Tabela switch_ports ja existe';
  END IF;
END $$;

-- Resultado final
SELECT 
  'Tabelas verificadas/criadas:' as status,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables;