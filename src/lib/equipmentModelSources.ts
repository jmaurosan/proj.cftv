import type { EquipmentModel } from './types'

const normalizeSourceText = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')

export type EquipmentModelSource = Partial<EquipmentModel> & {
  id: string
  brand?: string | null
  model?: string | null
}

export const mergeEquipmentModelSources = (
  catalogModels: EquipmentModel[],
  discoveredModels: EquipmentModelSource[],
  type: EquipmentModel['type'],
) => {
  const merged = new Map<string, EquipmentModel>()

  const add = (item: EquipmentModelSource, preferExisting: boolean) => {
    const brand = item.brand?.trim() || ''
    const model = item.model?.trim() || ''
    if (!model) return

    const key = `${normalizeSourceText(brand)}::${normalizeSourceText(model)}`
    if (preferExisting && merged.has(key)) return

    merged.set(key, {
      id: item.id,
      type,
      brand,
      model,
      resolution: item.resolution ?? null,
      lens_type: item.lens_type ?? null,
      ir_distance_meters: item.ir_distance_meters ?? null,
      operating_voltage: item.operating_voltage ?? null,
      current_consumption_a: item.current_consumption_a ?? null,
      channel_count: item.channel_count ?? null,
      poe_standard: item.poe_standard ?? null,
      max_ports: item.max_ports ?? null,
      is_poe: item.is_poe ?? false,
      notes: item.notes ?? null,
      user_id: item.user_id ?? '',
      created_at: item.created_at ?? '',
      updated_at: item.updated_at ?? '',
    })
  }

  discoveredModels.forEach((item) => add(item, true))
  catalogModels.forEach((item) => add(item, false))

  return Array.from(merged.values()).sort((a, b) =>
    `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}
