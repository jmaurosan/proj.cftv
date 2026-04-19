export interface Client {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  is_active: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export interface Dvr {
  id: string
  name: string
  ip_address: string
  model: string | null
  location: string
  total_channels: number
  status: string
  username: string | null
  password: string | null
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Camera {
  id: string
  name: string
  connection_type: string
  dvr_id: string | null
  channel_number: number | null
  ip_address: string | null
  mac_address: string | null
  poe_powered: boolean
  location: string
  type: string
  status: string
  resolution: string | null
  rtsp_url: string | null
  balun_id: string | null
  balun_port: number | null
  switch_id: string | null
  switch_port: number | null
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
  dvrs?: { name: string }
}

export interface PowerBalun {
  id: string
  name: string
  location: string
  total_ports: number
  status: string
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Switch {
  id: string
  name: string
  ip_address: string
  model: string | null
  location: string
  total_ports: number
  is_poe: boolean
  poe_standard: string | null
  poe_budget_watts: number | null
  status: string
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Credential {
  id: string
  device_type: string
  device_id: string | null
  label: string
  username: string
  password: string
  ip_address: string | null
  port: number | null
  protocol: string | null
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export type DvrInsert = Omit<Dvr, 'id' | 'created_at' | 'updated_at'>
export type DvrUpdate = Partial<Omit<Dvr, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type CameraInsert = Omit<Camera, 'id' | 'created_at' | 'updated_at' | 'dvrs'>
export type CameraUpdate = Partial<Omit<Camera, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'dvrs'>>

export type PowerBalunInsert = Omit<PowerBalun, 'id' | 'created_at' | 'updated_at'>
export type PowerBalunUpdate = Partial<Omit<PowerBalun, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type SwitchInsert = Omit<Switch, 'id' | 'created_at' | 'updated_at'>
export type SwitchUpdate = Partial<Omit<Switch, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type CredentialInsert = Omit<Credential, 'id' | 'created_at' | 'updated_at'>
export type CredentialUpdate = Partial<Omit<Credential, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export interface CableConnection {
  id: string
  camera_id: string
  cable_type: string
  wiring_standard: string | null
  custom_color_order: string | null
  pair1_function: string
  pair1_colors: string
  pair2_function: string
  pair2_colors: string
  pair3_function: string
  pair3_colors: string
  pair4_function: string
  pair4_colors: string
  has_splice: boolean
  splice_location: string | null
  splice_notes: string | null
  has_external_power: boolean
  power_source_info: string | null
  cable_length_meters: number | null
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export type CableConnectionInsert = Omit<CableConnection, 'id' | 'created_at' | 'updated_at'>
export type CableConnectionUpdate = Partial<Omit<CableConnection, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
