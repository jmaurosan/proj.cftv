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

// ============================================
// Cabeamento
// ============================================

export const CABLE_TYPES = [
  { value: 'coaxial_alimentado', label: 'Coaxial com Alimentação' },
  { value: 'utp_cat5', label: 'UTP Cat5' },
  { value: 'utp_cat5_blindado', label: 'UTP Cat5 Blindado' },
  { value: 'utp_cat6', label: 'UTP Cat6' },
  { value: 'utp_cat6_blindado', label: 'UTP Cat6 Blindado' },
] as const

export const CABLE_TYPE_LABELS: Record<string, string> = {
  coaxial_alimentado: 'Coaxial',
  utp_cat5: 'Cat5',
  utp_cat5_blindado: 'Cat5 Blind.',
  utp_cat6: 'Cat6',
  utp_cat6_blindado: 'Cat6 Blind.',
}

export const WIRING_STANDARDS = [
  { value: 'T568A', label: 'T568A' },
  { value: 'T568B', label: 'T568B' },
  { value: 'sequencial', label: 'Sequencial' },
  { value: 'personalizado', label: 'Personalizado' },
] as const

export const PAIR_FUNCTIONS = [
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
