export const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'manutencao', label: 'Manutenção' },
] as const

export const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-success/20 text-success',
  inativo: 'bg-danger/20 text-danger',
  manutencao: 'bg-warning/20 text-warning',
}

export const CAMERA_TYPES = [
  { value: 'dome', label: 'Dome' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'ptz', label: 'PTZ' },
  { value: 'fisheye', label: 'Fisheye' },
] as const

export const CAMERA_TECHNOLOGY_OPTIONS = [
  { value: 'multi_hd', label: 'Multi HD / 4 em 1' },
  { value: 'hdcvi', label: 'HDCVI' },
  { value: 'ahd', label: 'AHD' },
  { value: 'hdtvi', label: 'HDTVI' },
  { value: 'cvbs', label: 'CVBS / Analógica' },
  { value: 'ip_onvif', label: 'IP / ONVIF' },
  { value: 'wifi_smart', label: 'Wi-Fi Smart' },
  { value: 'full_color', label: 'Full Color' },
] as const

export const CAMERA_TECHNOLOGY_LABELS: Record<string, string> = {
  multi_hd: 'Multi HD / 4 em 1',
  hdcvi: 'HDCVI',
  ahd: 'AHD',
  hdtvi: 'HDTVI',
  cvbs: 'CVBS / Analógica',
  ip_onvif: 'IP / ONVIF',
  wifi_smart: 'Wi-Fi Smart',
  full_color: 'Full Color',
}

export const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const

export const DEVICE_TYPES = [
  { value: 'dvr', label: 'DVR' },
  { value: 'camera', label: 'Câmera' },
  { value: 'switch', label: 'Switch' },
  { value: 'outro', label: 'Outro' },
] as const

export const PROTOCOL_OPTIONS = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'rtsp', label: 'RTSP' },
  { value: 'ssh', label: 'SSH' },
] as const

export const CHANNEL_OPTIONS = [4, 8, 16, 32] as const

export const CONNECTION_TYPES = [
  { value: 'analogica', label: 'Analógica (DVR)' },
  { value: 'ip', label: 'IP (Rede)' },
] as const

export const POE_STANDARDS = [
  { value: '802.3af', label: '802.3af (PoE - 15.4W)' },
  { value: '802.3at', label: '802.3at (PoE+ - 30W)' },
  { value: '802.3bt', label: '802.3bt (PoE++ - 60/90W)' },
] as const

// ============================================
// Cabeamento
// ============================================

export const CABLE_TYPES = [
  { value: 'coaxial_rg59', label: 'Coaxial RG59 (vídeo)' },
  { value: 'coaxial_alimentado', label: 'Coaxial com Alimentação' },
  { value: 'utp_cat5', label: 'UTP Cat5' },
  { value: 'utp_cat5_blindado', label: 'UTP Cat5 Blindado' },
  { value: 'utp_cat6', label: 'UTP Cat6' },
  { value: 'utp_cat6_blindado', label: 'UTP Cat6 Blindado' },
  { value: 'fiber_optic', label: 'Fibra Óptica' },
  { value: 'power_12v', label: 'Alimentação 12V' },
  { value: 'power_24v', label: 'Alimentação 24V' },
] as const

export const CABLE_TYPE_LABELS: Record<string, string> = {
  coaxial_rg59: 'Coaxial RG59',
  coaxial_alimentado: 'Coaxial',
  utp_cat5: 'Cat5',
  utp_cat5_blindado: 'Cat5 Blind.',
  utp_cat6: 'Cat6',
  utp_cat6_blindado: 'Cat6 Blind.',
  fiber_optic: 'Fibra Óptica',
  power_12v: 'Alimentação 12V',
  power_24v: 'Alimentação 24V',
}

export const WIRING_STANDARDS = [
  { value: 'T568A', label: 'T568A' },
  { value: 'T568B', label: 'T568B' },
  { value: 'sequencial', label: 'Sequencial' },
  { value: 'personalizado', label: 'Personalizado' },
] as const

export const PAIR_FUNCTIONS = [
  { value: 'video', label: 'Sinal de vídeo' },
  { value: 'dados', label: 'Dados' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'nao_utilizado', label: 'Não utilizado' },
] as const

export const DEFAULT_PAIR_COLORS: Record<string, string[]> = {
  T568A: [
    'Verde / Branco-Verde',
    'Laranja / Branco-Laranja',
    'Azul / Branco-Azul',
    'Marrom / Branco-Marrom',
  ],
  T568B: [
    'Laranja / Branco-Laranja',
    'Verde / Branco-Verde',
    'Azul / Branco-Azul',
    'Marrom / Branco-Marrom',
  ],
  sequencial: [
    'Azul / Branco-Azul',
    'Laranja / Branco-Laranja',
    'Verde / Branco-Verde',
    'Marrom / Branco-Marrom',
  ],
}

export const WIRE_COLORS = [
  { value: 'Azul', label: 'Azul' },
  { value: 'Branco-Azul', label: 'Branco do Azul' },
  { value: 'Laranja', label: 'Laranja' },
  { value: 'Branco-Laranja', label: 'Branco do Laranja' },
  { value: 'Verde', label: 'Verde' },
  { value: 'Branco-Verde', label: 'Branco do Verde' },
  { value: 'Marrom', label: 'Marrom' },
  { value: 'Branco-Marrom', label: 'Branco do Marrom' },
] as const

// ============================================
// Roteadores e Internet
// ============================================

export const ROUTER_TYPES = [
  { value: 'edge_router', label: 'Edge Router' },
  { value: 'mikrotik', label: 'MikroTik' },
  { value: 'load_balancer', label: 'Load Balancer' },
  { value: 'generic', label: 'Roteador Genérico' },
] as const

export const CONNECTION_TYPES_INTERNET = [
  { value: 'fiber', label: 'Fibra Óptica' },
  { value: 'adsl', label: 'ADSL' },
  { value: 'wireless', label: 'Wireless' },
  { value: '4g', label: '4G/LTE' },
  { value: '5g', label: '5G' },
  { value: 'cable', label: 'Cable/Coaxial' },
  { value: 'other', label: 'Outro' },
] as const

export const IP_TYPE_OPTIONS = [
  { value: 'dynamic', label: 'DHCP (Dinâmico)' },
  { value: 'static', label: 'IP Fixo (Privado)' },
  { value: 'public_static', label: 'IP Público Fixo' },
] as const
