export type Screen = 
  | 'dashboard' 
  | 'dvrs' 
  | 'cameras' 
  | 'infrastructure'
  | 'map' 
  | 'floor-plan'
  | 'add-dvr' 
  | 'add-camera' 
  | 'add-balun' 
  | 'add-switch' 
  | 'test-view' 
  | 'register-client'
  | 'crimp-reference';

export interface DVR {
  id: string;
  name: string;
  brand: string;
  model: string;
  ip: string;
  location: string;
  status: 'online' | 'warning' | 'offline';
  channels: number;
  firmware: string;
  user: string;
  password?: string; // Campo sensível
  hikConnect: boolean;
  hikConnectUser?: string;
  hikConnectPassword?: string;
}

export interface Camera {
  id: string;
  name: string;
  brand: string;
  model: string;
  ip: string;
  location: string;
  status: 'online' | 'warning' | 'offline';
  type: 'IP' | 'ANALOG';
  dvrId: string;
  channel: string;
  user?: string;
  password?: string;
  streamUrl?: string;
  imageUrl?: string;
  // Detalhes de Cabeamento
  cable_type?: 'UTP' | 'COAXIAL' | 'FIBER';
  cable_category?: 'CAT5E' | 'CAT6' | 'BIPOLAR' | 'FLEX';
  is_shielded?: boolean;
  crimp_standard?: '568A' | '568B' | 'SEQUENTIAL' | 'CUSTOM';
  pair_map?: string; // Descrição de como as vias foram usadas
}

export interface PowerBalun {
  id: string;
  name: string;
  brand: 'INTELBRAS' | 'OUTRA';
  model: 'VW 1-16' | 'VW 8' | string;
  location: string;
  ports: number;
  status: 'online' | 'warning' | 'offline';
}

export interface NetworkSwitch {
  id: string;
  name: string;
  brand: string;
  model: string;
  ip: string;
  location: string;
  ports: number;
  status: 'online' | 'warning' | 'offline';
}

export interface Connection {
  id: string;
  sourceId: string; // Camera, Balun, etc
  targetId: string; // Balun, DVR, Switch
  sourcePort: string;
  targetPort: string;
  cableType: 'UTP' | 'COAXIAL' | 'FIBER';
}

export interface LogEntry {
  id: string;
  type: 'system' | 'warning' | 'critical';
  message: string;
  location: string;
  time: string;
}

export interface Alerta {
  id: string;
  origin: string;
  event: string;
  status: string;
}
