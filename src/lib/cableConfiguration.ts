import type { PairFunction } from './balunConfiguration'

export type CablePresetId =
  | 'video_1cam_power_1'
  | 'video_2cam_power_2'
  | 'video_3cam_power_1'
  | 'video_4cam'
  | 'video_1cam_ext'
  | 'video_2cam_ext'
  | 'video_3cam_ext'
  | 'network_data'
  | 'personalizado'

export type CablePairFunctions = [PairFunction, PairFunction, PairFunction, PairFunction]

export type PowerSourceKind = 'utp' | 'ext' | 'data' | 'custom'

export interface CablePresetInfo {
  id: CablePresetId
  label: string
  functions: CablePairFunctions
  videoCameras: number
  powerPairs: number
  unusedPairs: number
  powerSource: PowerSourceKind
  description: string
}

export const CABLE_PRESETS: Record<CablePresetId, CablePresetInfo> = {
  video_1cam_power_1: {
    id: 'video_1cam_power_1',
    label: '1 câmera + 1 par de alimentação',
    functions: ['video', 'alimentacao', 'nao_utilizado', 'nao_utilizado'],
    videoCameras: 1,
    powerPairs: 1,
    unusedPairs: 2,
    powerSource: 'utp',
    description: '1 par vídeo, 1 par 12V, 2 pares reserva',
  },
  video_2cam_power_2: {
    id: 'video_2cam_power_2',
    label: '2 câmeras + 2 pares de alimentação',
    functions: ['video', 'video', 'alimentacao', 'alimentacao'],
    videoCameras: 2,
    powerPairs: 2,
    unusedPairs: 0,
    powerSource: 'utp',
    description: '2 pares vídeo, 2 pares alimentam as câmeras',
  },
  video_3cam_power_1: {
    id: 'video_3cam_power_1',
    label: '3 câmeras + 1 par de alimentação',
    functions: ['video', 'video', 'video', 'alimentacao'],
    videoCameras: 3,
    powerPairs: 1,
    unusedPairs: 0,
    powerSource: 'utp',
    description: '3 pares vídeo, 1 par alimenta as 3 câmeras',
  },
  video_4cam: {
    id: 'video_4cam',
    label: '4 câmeras (alimentação externa)',
    functions: ['video', 'video', 'video', 'video'],
    videoCameras: 4,
    powerPairs: 0,
    unusedPairs: 0,
    powerSource: 'ext',
    description: '4 pares vídeo. Alimentação por fonte local ou cabo paralelo.',
  },
  video_1cam_ext: {
    id: 'video_1cam_ext',
    label: '1 câmera (alimentação externa)',
    functions: ['video', 'nao_utilizado', 'nao_utilizado', 'nao_utilizado'],
    videoCameras: 1,
    powerPairs: 0,
    unusedPairs: 3,
    powerSource: 'ext',
    description: '1 par vídeo, 3 pares reserva. Alimentação externa.',
  },
  video_2cam_ext: {
    id: 'video_2cam_ext',
    label: '2 câmeras (alimentação externa)',
    functions: ['video', 'video', 'nao_utilizado', 'nao_utilizado'],
    videoCameras: 2,
    powerPairs: 0,
    unusedPairs: 2,
    powerSource: 'ext',
    description: '2 pares vídeo, 2 pares reserva. Alimentação externa.',
  },
  video_3cam_ext: {
    id: 'video_3cam_ext',
    label: '3 câmeras (alimentação externa)',
    functions: ['video', 'video', 'video', 'nao_utilizado'],
    videoCameras: 3,
    powerPairs: 0,
    unusedPairs: 1,
    powerSource: 'ext',
    description: '3 pares vídeo, 1 par reserva. Alimentação externa.',
  },
  network_data: {
    id: 'network_data',
    label: 'Rede de dados (câmera IP)',
    functions: ['dados', 'dados', 'dados', 'dados'],
    videoCameras: 0,
    powerPairs: 0,
    unusedPairs: 0,
    powerSource: 'data',
    description: '4 pares de dados para câmera IP.',
  },
  personalizado: {
    id: 'personalizado',
    label: 'Personalizado',
    functions: ['nao_utilizado', 'nao_utilizado', 'nao_utilizado', 'nao_utilizado'],
    videoCameras: 0,
    powerPairs: 0,
    unusedPairs: 4,
    powerSource: 'custom',
    description: 'Configuração livre dos 4 pares.',
  },
}

export function applyCablePreset(preset: CablePresetId): CablePairFunctions {
  return [...CABLE_PRESETS[preset].functions] as CablePairFunctions
}

function countFunctions(functions: PairFunction[]): Record<string, number> {
  return functions.reduce<Record<string, number>>((acc, fn) => {
    acc[fn] = (acc[fn] ?? 0) + 1
    return acc
  }, {})
}

function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if ((a[key] ?? 0) !== (b[key] ?? 0)) return false
  return true
}

/**
 * Detecta o preset a partir das funções dos 4 pares. Ignora ordem física dos pares —
 * casa por contagem de cada função. Retorna 'personalizado' se nenhuma combinação bate.
 */
export function detectCablePreset(functions: PairFunction[]): CablePresetId {
  if (functions.length !== 4) return 'personalizado'
  const target = countFunctions(functions)
  for (const preset of Object.values(CABLE_PRESETS)) {
    if (preset.id === 'personalizado') continue
    if (sameCounts(target, countFunctions(preset.functions))) return preset.id
  }
  return 'personalizado'
}

export interface CablePair {
  pair_number: number
  function: PairFunction
  camera_id: string | null
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Regras validadas:
 *   - exatamente 4 pares, numerados de 1 a 4 sem lacunas
 *   - função 'video' exige camera_id preenchido
 *   - camera_id só é permitido em pares com função 'video'
 *   - a mesma câmera não pode aparecer em 2 pares de vídeo do mesmo cabo
 */
export function validateCablePairs(pairs: CablePair[]): ValidationResult {
  const errors: string[] = []

  if (pairs.length !== 4) {
    errors.push(`Cabo UTP precisa ter exatamente 4 pares (encontrados: ${pairs.length}).`)
  }

  const sortedNumbers = [...pairs.map((p) => p.pair_number)].sort((a, b) => a - b)
  if (sortedNumbers.join(',') !== '1,2,3,4') {
    errors.push('Pares devem ser numerados de 1 a 4, sem repetição.')
  }

  for (const pair of pairs) {
    if (pair.function === 'video' && !pair.camera_id) {
      errors.push(`Par ${pair.pair_number}: função "vídeo" exige câmera vinculada.`)
    }
    if (pair.function !== 'video' && pair.camera_id) {
      errors.push(`Par ${pair.pair_number}: apenas pares de vídeo podem ter câmera vinculada.`)
    }
  }

  const videoCameraIds = pairs
    .filter((p) => p.function === 'video' && p.camera_id)
    .map((p) => p.camera_id as string)
  if (new Set(videoCameraIds).size !== videoCameraIds.length) {
    errors.push('A mesma câmera não pode ocupar dois pares de vídeo no mesmo cabo.')
  }

  return { valid: errors.length === 0, errors }
}

export function countVideoCameras(functions: PairFunction[]): number {
  return functions.filter((fn) => fn === 'video').length
}
