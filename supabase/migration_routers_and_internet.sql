-- Tabela de roteadores (Edge Router, Mikrotik, etc.)
CREATE TABLE IF NOT EXISTS routers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  device_type TEXT NOT NULL DEFAULT 'generic', -- 'edge_router', 'mikrotik', 'generic', 'load_balancer'
  location TEXT,
  ip_address TEXT,
  username TEXT,
  password TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conexões de internet (operadoras)
CREATE TABLE IF NOT EXISTS internet_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  router_id UUID REFERENCES routers(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL, -- Vivo, Claro, NET, etc.
  connection_type TEXT NOT NULL DEFAULT 'fiber', -- 'fiber', 'adsl', 'wireless', '4g', '5g', 'cable', 'other'
  ip_type TEXT NOT NULL DEFAULT 'dynamic', -- 'dynamic', 'static', 'public_static'
  ip_address TEXT, -- IP do gateway/modern
  subnet_mask TEXT, -- Máscara de sub-rede
  gateway_ip TEXT, -- Gateway padrão
  dhcp_enabled BOOLEAN DEFAULT true,
  speed_down_mbps INTEGER, -- Velocidade.download em Mbps
  speed_up_mbps INTEGER, -- Velocidade upload em Mbps
  monthly_cost DECIMAL(10,2), -- Custo mensal
  contract_number TEXT, -- Número do contrato
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de sub-redes/segmentação de rede
CREATE TABLE IF NOT EXISTS network_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- 'Rede Admin', 'Rede Catracas', 'Rede Cameras', 'Wi-Fi Convidados'
  description TEXT,
  network_ip TEXT, -- 192.168.0.0
  subnet_mask TEXT, -- 255.255.255.0
  gateway_ip TEXT, -- IP do gateway que entrega essa sub-rede
  vlan_id INTEGER,
  router_id UUID REFERENCES routers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_routers_client ON routers(client_id);
CREATE INDEX IF NOT EXISTS idx_internet_connections_router ON internet_connections(router_id);
CREATE INDEX IF NOT EXISTS idx_internet_connections_client ON internet_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_network_segments_client ON network_segments(client_id);
CREATE INDEX IF NOT EXISTS idx_network_segments_router ON network_segments(router_id);

-- RLS Policies
ALTER TABLE routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE internet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_segments ENABLE ROW LEVEL SECURITY;

-- Políticas para routers
CREATE POLICY "Users can view own routers" ON routers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routers" ON routers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routers" ON routers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routers" ON routers FOR DELETE USING (auth.uid() = user_id);

-- Políticas para internet_connections
CREATE POLICY "Users can view own connections" ON internet_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON internet_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON internet_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON internet_connections FOR DELETE USING (auth.uid() = user_id);

-- Políticas para network_segments
CREATE POLICY "Users can view own segments" ON network_segments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own segments" ON network_segments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own segments" ON network_segments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own segments" ON network_segments FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER routers_updated_at BEFORE UPDATE ON routers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER internet_connections_updated_at BEFORE UPDATE ON internet_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER network_segments_updated_at BEFORE UPDATE ON network_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comentários para documentação
COMMENT ON TABLE routers IS 'Roteadores e dispositivos de rede (Edge Router, Mikrotik, etc.)';
COMMENT ON TABLE internet_connections IS 'Conexões de internet (operadoras) vinculadas aos roteadores';
COMMENT ON TABLE network_segments IS 'Segmentos/sub-redes de rede para diferentes finalidades';