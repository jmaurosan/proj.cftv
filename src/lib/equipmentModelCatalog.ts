import type { EquipmentModel } from './types'

type EquipmentModelLike = Pick<EquipmentModel, 'brand' | 'model'> & { id?: string }

export const normalizeCatalogText = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')

export const findEquipmentModelByText = <T extends EquipmentModelLike>(
  models: T[],
  modelText: string,
  brandText = '',
) => {
  const normalizedModel = normalizeCatalogText(modelText)
  if (!normalizedModel) return undefined

  const matches = models.filter((item) => normalizeCatalogText(item.model) === normalizedModel)
  if (!matches.length) return undefined

  const normalizedBrand = normalizeCatalogText(brandText)
  if (!normalizedBrand) return matches[0]

  return matches.find((item) => normalizeCatalogText(item.brand) === normalizedBrand) ?? matches[0]
}

export const parseCameraModelDetails = (notes?: string | null) => {
  const lensMatch = notes?.match(/(?:Lente|Lens)\s*:\s*([^|;]+)/i)
  const irMatch = notes?.match(/(?:IR|Distância IR|Distancia IR)\s*:\s*(\d+(?:[.,]\d+)?)\s*m?/i)
  const voltageMatch = notes?.match(/(?:Tensão|Tensao|Voltage)\s*:\s*([^|;]+)/i)
  const currentMatch = notes?.match(/(?:Corrente|Current)\s*:\s*(\d+(?:[.,]\d+)?)\s*A?/i)
  const connectionMatch = notes?.match(/(?:Conexão|Conexao|Connection)\s*:\s*([^|;]+)/i)
  const technologyMatch = notes?.match(/(?:Tecnologia|Technology)\s*:\s*([^|;]+)/i)
  const powerSourceMatch = notes?.match(/(?:Alimentação|Alimentacao|Power source)\s*:\s*([^|;]+)/i)
  const powerSupplyMatch = notes?.match(/(?:Fonte|Power supply)\s*:\s*(\d+V)(?:\s+(\d+(?:[.,]\d+)?)A)?/i)

  return {
    lensType: lensMatch?.[1]?.trim() ?? '',
    irDistanceMeters: irMatch?.[1]?.replace(',', '.') ?? '',
    operatingVoltage: voltageMatch?.[1]?.trim() ?? '',
    currentConsumption: currentMatch?.[1]?.replace(',', '.') ?? '',
    connectionType: connectionMatch?.[1]?.trim() ?? '',
    technology: technologyMatch?.[1]?.trim() ?? '',
    powerSourceType: powerSourceMatch?.[1]?.trim() ?? '',
    powerSupplyVoltage: powerSupplyMatch?.[1]?.toUpperCase() ?? '',
    powerSupplyCurrent: powerSupplyMatch?.[2]?.replace(',', '.') ?? '',
  }
}

export const buildCameraModelNotes = ({
  lensType,
  irDistanceMeters,
  operatingVoltage,
  currentConsumption,
  connectionType,
  technology,
  powerSourceType,
  powerSupplyVoltage,
  powerSupplyCurrent,
}: {
  lensType: string
  irDistanceMeters: string
  operatingVoltage: string
  currentConsumption: string
  connectionType: string
  technology: string
  powerSourceType: string
  powerSupplyVoltage: string
  powerSupplyCurrent: string
}) =>
  [
    lensType ? `Lente: ${lensType}` : '',
    irDistanceMeters ? `IR: ${irDistanceMeters.replace('.', ',')}m` : '',
    operatingVoltage ? `Tensão: ${operatingVoltage}` : '',
    currentConsumption ? `Corrente: ${currentConsumption.replace('.', ',')}A` : '',
    connectionType ? `Conexão: ${connectionType}` : '',
    technology ? `Tecnologia: ${technology}` : '',
    powerSourceType ? `Alimentação: ${powerSourceType}` : '',
    powerSourceType === 'power_supply' && powerSupplyVoltage
      ? `Fonte: ${powerSupplyVoltage}${powerSupplyCurrent ? ` ${powerSupplyCurrent.replace('.', ',')}A` : ''}`
      : '',
  ].filter(Boolean).join(' | ') || null

export const buildSwitchModelNotes = (poeBudgetWatts: string | number | null | undefined) =>
  poeBudgetWatts ? `Budget PoE: ${poeBudgetWatts}W` : null

export const parseSwitchModelDetails = (notes?: string | null) => {
  const budgetMatch = notes?.match(/Budget PoE\s*:\s*(\d+(?:[.,]\d+)?)\s*W?/i)
  return {
    poeBudgetWatts: budgetMatch?.[1]?.replace(',', '.') ?? '',
  }
}
