export interface Client {
  id: string
  name: string
  person_type: 'PJ' | 'PF'
  cnpj: string | null
  cpf: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  zipcode: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export interface Dvr {
  id: string
  name: string
  brand: string | null
  ip_address: string
  model: string | null
  serial_number: string | null
  installation_date: string | null
  location: string
  total_channels: number
  analog_channels: number
  ip_channels: number
  operation_mode: 'hybrid' | 'nvr' | 'dvr_only'
  disabled_analog_channels: number[]
  hd_capacity_tb: number | null
  hd_brand: string | null
  hd_model: string | null
  status: string
  username: string | null
  password: string | null
  hik_connect_account: string | null
  hik_connect_password: string | null
  hik_connect_verification_code: string | null
  hik_connect_sharing_info: string | null
  hik_connect_qr_code_url: string | null
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Camera {
  id: string
  name: string
  brand: string | null
  model: string | null
  lens_type: string | null
  ir_distance_meters: number | null
  serial_number: string | null
  installation_date: string | null
  technology: string | null
  connection_type: string
  dvr_id: string | null
  channel_number: number | null
  ip_address: string | null
  mac_address: string | null
  poe_powered: boolean
  power_source_type: string | null
  power_supply_voltage: string | null
  power_supply_current_a: number | null
  operating_voltage: string | null
  current_consumption_a: number | null
  power_supply_brand: string | null
  power_supply_model: string | null
  location: string
  type: string
  status: string
  resolution: string | null
  rtsp_url: string | null
  streaming_user: string | null
  streaming_password: string | null
  media_mtx_stream_name?: string | null
  balun_id: string | null
  balun_port: number | null
  switch_id: string | null
  switch_port: number | null
  qr_code_url: string | null
  installation_photo_url: string | null
  notes: string | null
  site_id: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
  dvrs?: { name: string; analog_channels?: number | null; disabled_analog_channels?: number[] | null }
}

export interface CameraInstallationPhoto {
  id: string
  camera_id: string
  storage_path: string
  label: string | null
  sort_order: number
  user_id: string
  created_at: string
  updated_at: string
}

export type BalunType = 'passive' | 'power'

export interface PowerBalun {
  id: string
  name: string
  serial_number: string | null
  installation_date: string | null
  balun_type: BalunType
  location: string
  total_ports: number
  status: string
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Balun4x1Output {
  id: string
  balun_id: string
  output_number: number
  channel_start: number
  channel_end: number
  notes: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Switch {
  id: string
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  installation_date: string | null
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

// ------------------------------------------------------------
// Novo modelo de cabos (Fase 1)
// ------------------------------------------------------------

export interface UtpCablePair {
  id: string
  cable_id: string
  pair_number: number
  function: string
  camera_id: string | null
  wire1_color: string | null
  wire2_color: string | null
  created_at: string
  updated_at: string
}

export interface UtpCable {
  id: string
  client_id: string
  user_id: string
  name: string | null
  cable_type: string
  wiring_standard: string | null
  custom_color_order: string | null
  cable_length_meters: number | null
  has_splice: boolean
  splice_location: string | null
  splice_notes: string | null
  notes: string | null
  legacy_cable_id: string | null
  created_at: string
  updated_at: string
  utp_cable_pairs?: UtpCablePair[]
}

export type UtpCableInsert = Omit<UtpCable, 'id' | 'created_at' | 'updated_at' | 'utp_cable_pairs'>
export type UtpCableUpdate = Partial<Omit<UtpCable, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'utp_cable_pairs'>>

export interface UtpCablePairInput {
  pair_number: number
  function: string
  camera_id: string | null
  wire1_color: string | null
  wire2_color: string | null
}

export interface PowerCable {
  id: string
  client_id: string
  user_id: string
  name: string
  wire_gauge_mm2: number | null
  voltage: string | null
  cable_length_meters: number | null
  power_source_info: string | null
  notes: string | null
  legacy_cable_id: string | null
  created_at: string
  updated_at: string
  camera_ids?: string[]
}

export type PowerCableInsert = Omit<PowerCable, 'id' | 'created_at' | 'updated_at' | 'camera_ids'>
export type PowerCableUpdate = Partial<Omit<PowerCable, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'camera_ids'>>

// ------------------------------------------------------------
// Sites físicos (Fase 2) — elevadores, blocos, guarita, etc.
// ------------------------------------------------------------

export type SiteType =
  | 'elevador_social'
  | 'elevador_servico'
  | 'elevador_panoramico'
  | 'bloco'
  | 'pavimento'
  | 'guarita'
  | 'portaria'
  | 'estacionamento'
  | 'area_comum'
  | 'ext_externo'
  | 'outro'

export interface InstallationSite {
  id: string
  client_id: string
  user_id: string
  name: string
  site_type: SiteType
  parent_site_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InstallationSiteInsert = Omit<InstallationSite, 'id' | 'created_at' | 'updated_at'>
export type InstallationSiteUpdate = Partial<Omit<InstallationSite, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// Router modes (Fase 2)
export type RouterMode = 'router' | 'ap' | 'client' | 'bridge' | 'wisp' | 'other'

export interface EquipmentLog {
  id: string
  equipment_type: 'camera' | 'dvr' | 'balun' | 'switch' | 'credential'
  equipment_id: string | null
  action: 'created' | 'updated' | 'deleted'
  equipment_name: string | null
  details: Record<string, unknown> | null
  user_id: string
  created_at: string
}

export interface BalunPort {
  id: string
  balun_id: string
  port_number: number
  is_active: boolean
  camera_id: string | null
  notes: string | null
  user_id: string
  created_at: string
  updated_at: string
  cameras?: { name: string; dvr_id: string | null; channel_number: number | null; dvrs?: { name: string } | null }
}

export interface DvrChannel {
  id: string
  dvr_id: string
  channel_number: number
  is_active: boolean
  notes: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface SwitchPort {
  id: string
  switch_id: string
  port_number: number
  device_type: string | null
  device_id: string | null
  device_name: string | null
  is_active: boolean
  notes: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface EquipmentModel {
  id: string
  type: 'camera' | 'dvr' | 'switch' | 'balun' | 'router' | 'power_supply' | 'other'
  brand: string
  model: string
  resolution: string | null
  lens_type?: string | null
  ir_distance_meters?: number | null
  operating_voltage?: string | null
  current_consumption_a?: number | null
  channel_count: number | null
  poe_standard: string | null
  max_ports: number | null
  is_poe: boolean
  notes: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Rack {
  id: string
  topology_id: string
  client_id: string
  user_id: string
  name: string
  location: string
  equipment_ids: string[]
  has_nobreak: boolean
  power_notes: string | null
  cable_notes: string | null
  media_paths: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export type RackInsert = Omit<Rack, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type RackUpdate = Partial<Omit<Rack, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export interface ProjectMonitor {
  id: string
  client_id: string
  user_id: string
  rack_id: string | null
  name: string
  brand: string
  model: string
  power_watts: number | null
  input_voltage: string
  location: string | null
  serial_number: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  racks?: { name: string } | null
}

export type ProjectMonitorInsert = Omit<ProjectMonitor, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'racks'>
export type ProjectMonitorUpdate = Partial<Omit<ProjectMonitor, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'racks'>>

export interface Router {
  id: string
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  installation_date: string | null
  device_type: string
  location: string | null
  ip_address: string | null
  username: string | null
  password: string | null
  status: string
  notes: string | null
  mode: RouterMode
  paired_router_id: string | null
  site_id: string | null
  powered_by_poe_injector: boolean
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface InternetConnection {
  id: string
  router_id: string | null
  operator_name: string
  connection_type: string
  ip_type: string
  ip_address: string | null
  subnet_mask: string | null
  gateway_ip: string | null
  dhcp_enabled: boolean
  contract_number: string | null
  is_active: boolean
  notes: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface NetworkSegment {
  id: string
  name: string
  description: string | null
  network_ip: string | null
  subnet_mask: string | null
  gateway_ip: string | null
  vlan_id: number | null
  router_id: string | null
  client_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface DeviceBackup {
  id: string
  client_id: string | null
  equipment_type: 'router' | 'switch' | 'dvr'
  equipment_id: string
  file_name: string
  file_path: string
  file_size: number | null
  notes: string | null
  created_at: string
}
