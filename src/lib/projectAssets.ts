export type EquipmentDocumentCategory = 'manual' | 'datasheet' | 'warranty' | 'certificate' | 'diagram' | 'other'
export type DocumentEquipmentType = 'project' | 'camera' | 'dvr' | 'switch' | 'router' | 'balun' | 'nobreak'
export type ProjectMediaType = 'image' | 'video'

export interface EquipmentOption {
  id: string
  name: string
  type: DocumentEquipmentType | 'monitor'
  typeLabel: string
}

export interface Nobreak {
  id: string
  name: string
  brand: string
  model: string
  serialNumber: string
  installationDate: string
  location: string
  ratedPowerVa: number
  ratedPowerWatts: number
  topology: string
  inputVoltage: string
  inputVoltageMode: string
  outputVoltage: number
  outletQuantity: number
  hasProtection: boolean
  protections: string[]
  batteryQuantity: number
  batteryVoltage: number
  batteryCapacityAh: number
  batteryBrand: string
  batteryModel: string
  externalBatteryConnector: string
  autonomyMinutes: number | null
  powersWholeProject: boolean
  poweredEquipmentIds: string[]
  manufacturerUrl: string
  status: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface EquipmentDocument {
  id: string
  equipmentType: DocumentEquipmentType
  equipmentId: string
  equipmentName: string
  title: string
  category: EquipmentDocumentCategory
  manufacturerUrl: string
  fileName: string | null
  filePath: string | null
  fileSize: number | null
  createdAt: string
}

export interface ProjectMedia {
  id: string
  equipmentType: DocumentEquipmentType
  equipmentId: string
  equipmentName: string
  title: string
  description: string
  mediaType: ProjectMediaType
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  recordedAt: string | null
  createdAt: string
}

export interface ProjectAssets {
  nobreaks: Nobreak[]
  documents: EquipmentDocument[]
  media: ProjectMedia[]
}

type NobreakValidationInput = Partial<Pick<Nobreak,
  'name' | 'brand' | 'model' | 'location' | 'ratedPowerVa' | 'ratedPowerWatts' |
  'topology' | 'inputVoltage' | 'inputVoltageMode' | 'outputVoltage' | 'outletQuantity' |
  'hasProtection' | 'protections' | 'batteryQuantity' | 'batteryVoltage' | 'batteryCapacityAh'
>>

const EMPTY_ASSETS: ProjectAssets = { nobreaks: [], documents: [], media: [] }

const parseNotesObject = (notes: string | null | undefined): Record<string, unknown> => {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function parseProjectAssets(notes: string | null | undefined): ProjectAssets {
  const notesObject = parseNotesObject(notes)
  const assets = notesObject.projectAssets
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) return { ...EMPTY_ASSETS }
  const record = assets as Record<string, unknown>
  return {
    nobreaks: Array.isArray(record.nobreaks) ? record.nobreaks.map(normalizeNobreak) : [],
    documents: Array.isArray(record.documents) ? record.documents as EquipmentDocument[] : [],
    media: Array.isArray(record.media) ? record.media as ProjectMedia[] : [],
  }
}

function normalizeNobreak(value: unknown): Nobreak {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const legacyWatts = Number(record.outputPowerWatts || record.inputPowerWatts || 0)
  return {
    ...record,
    ratedPowerWatts: Number(record.ratedPowerWatts || legacyWatts),
    topology: typeof record.topology === 'string' ? record.topology : 'interactive',
    inputVoltage: String(record.inputVoltage || ''),
    inputVoltageMode: typeof record.inputVoltageMode === 'string' ? record.inputVoltageMode : 'single',
    outletQuantity: Number(record.outletQuantity || 0),
    externalBatteryConnector: typeof record.externalBatteryConnector === 'string' ? record.externalBatteryConnector : '',
  } as unknown as Nobreak
}

export function mergeProjectAssets(notes: string | null | undefined, assets: ProjectAssets) {
  return JSON.stringify({ ...parseNotesObject(notes), projectAssets: assets })
}

export function validateNobreak(nobreak: NobreakValidationInput) {
  if (!nobreak.name?.trim() || !nobreak.brand?.trim() || !nobreak.model?.trim() || !nobreak.location?.trim()) {
    return 'Informe nome, marca, modelo e localização do nobreak.'
  }
  if (!nobreak.ratedPowerVa || nobreak.ratedPowerVa <= 0) return 'Informe a potência nominal do nobreak em VA.'
  if (!nobreak.ratedPowerWatts || nobreak.ratedPowerWatts <= 0) return 'Informe a potência ativa do nobreak em watts.'
  if (nobreak.ratedPowerWatts > nobreak.ratedPowerVa) return 'A potência ativa não pode ser maior que a potência aparente em VA.'
  if (!nobreak.topology?.trim()) return 'Informe a topologia do nobreak.'
  if (!nobreak.inputVoltage?.trim() || !nobreak.inputVoltageMode || !nobreak.outputVoltage) return 'Informe as tensões de entrada e saída.'
  if (!nobreak.outletQuantity || nobreak.outletQuantity < 1) return 'Informe ao menos uma tomada de saída.'
  if (!nobreak.batteryQuantity || nobreak.batteryQuantity < 1) return 'Informe ao menos uma bateria utilizada pelo nobreak.'
  if (!nobreak.batteryVoltage || !nobreak.batteryCapacityAh) return 'Informe tensão e carga da bateria em Ah.'
  if (nobreak.hasProtection && (!nobreak.protections || nobreak.protections.length === 0)) {
    return 'Selecione ao menos uma proteção ou marque que o nobreak não possui proteção.'
  }
  return null
}

export function describeBatteryBank(nobreak: Pick<Nobreak, 'batteryQuantity' | 'batteryVoltage' | 'batteryCapacityAh'>) {
  return `${nobreak.batteryQuantity} x ${nobreak.batteryVoltage}V ${nobreak.batteryCapacityAh}Ah`
}
