export interface PowerConsumptionInput {
  power_watts?: number | null
  operating_voltage?: string | null
  current_consumption_a?: number | null
}

export interface PowerCategorySummary {
  watts: number
  calculatedCount: number
  missingCount: number
  totalCount: number
}

export const parseSingleVoltage = (value: string | null | undefined) => {
  if (!value?.trim()) return null
  const matches = value.replace(',', '.').match(/\d+(?:\.\d+)?/g) ?? []
  if (matches.length !== 1) return null
  const voltage = Number(matches[0])
  return Number.isFinite(voltage) && voltage > 0 ? voltage : null
}

export const calculatePowerWatts = (input: PowerConsumptionInput) => {
  const directWatts = Number(input.power_watts)
  if (Number.isFinite(directWatts) && directWatts > 0) return Math.round(directWatts * 100) / 100

  const voltage = parseSingleVoltage(input.operating_voltage)
  const current = Number(input.current_consumption_a)
  if (!voltage || !Number.isFinite(current) || current <= 0) return null
  return Math.round(voltage * current * 100) / 100
}

export const summarizePowerCategory = (items: PowerConsumptionInput[]): PowerCategorySummary => {
  let watts = 0
  let calculatedCount = 0
  let missingCount = 0
  for (const item of items) {
    const itemWatts = calculatePowerWatts(item)
    if (itemWatts == null) missingCount += 1
    else { watts += itemWatts; calculatedCount += 1 }
  }
  return {
    watts: Math.round(watts * 100) / 100,
    calculatedCount,
    missingCount,
    totalCount: items.length,
  }
}
