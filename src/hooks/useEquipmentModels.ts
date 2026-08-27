import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EquipmentModel } from '../lib/types'
import { useAuth } from './useAuth'
import { translateError } from '../lib/errorTranslator'
import { mergeEquipmentModelSources, type EquipmentModelSource } from '../lib/equipmentModelSources'
import { requireCompatibleSchema } from '../lib/schemaCompatibility'

const EQUIPMENT_SOURCE_CONFIG: Partial<Record<EquipmentModel['type'], {
  table: string
  select: string
  map: (row: Record<string, unknown>) => EquipmentModelSource
}>> = {
  camera: {
    table: 'cameras',
    select: 'id, brand, model, resolution, lens_type, ir_distance_meters, operating_voltage, current_consumption_a',
    map: (row) => ({ ...row, id: `camera:${row.id}` } as EquipmentModelSource),
  },
  dvr: {
    table: 'dvrs',
    select: 'id, brand, model, total_channels',
    map: (row) => ({ ...row, id: `dvr:${row.id}`, channel_count: row.total_channels } as EquipmentModelSource),
  },
  switch: {
    table: 'switches',
    select: 'id, brand, model, total_ports, is_poe, poe_standard, poe_budget_watts',
    map: (row) => ({
      ...row,
      id: `switch:${row.id}`,
      max_ports: row.total_ports,
      notes: row.poe_budget_watts ? `Budget PoE: ${row.poe_budget_watts}W` : null,
    } as EquipmentModelSource),
  },
  balun: {
    table: 'power_baluns',
    select: 'id, name, total_ports, balun_type',
    map: (row) => ({
      id: `balun:${row.id}`,
      brand: row.balun_type === 'passive' ? 'Balun Passivo' : 'Power Balun',
      model: row.name,
      max_ports: row.total_ports,
    } as EquipmentModelSource),
  },
  router: {
    table: 'routers',
    select: 'id, brand, model, device_type',
    map: (row) => ({ ...row, id: `router:${row.id}`, notes: row.device_type ? `Tipo: ${row.device_type}` : null } as EquipmentModelSource),
  },
}

export function useEquipmentModels(type?: string) {
  const { user } = useAuth()
  const [models, setModels] = useState<EquipmentModel[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let query = supabase.from('equipment_models').select('*').eq('user_id', user.id).order('brand')
    if (type) query = query.eq('type', type)
    const sourceConfig = type ? EQUIPMENT_SOURCE_CONFIG[type as EquipmentModel['type']] : undefined
    const [catalogResult, sourceResult] = await Promise.all([
      query,
      sourceConfig
        ? supabase.from(sourceConfig.table).select(sourceConfig.select).eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (!catalogResult.error) {
      const catalogModels = (catalogResult.data as EquipmentModel[]) || []
      const discoveredModels = sourceConfig && !sourceResult.error
        ? ((sourceResult.data as Record<string, unknown>[]) || []).map(sourceConfig.map)
        : []
      setModels(type
        ? mergeEquipmentModelSources(catalogModels, discoveredModels, type as EquipmentModel['type'])
        : catalogModels)
    }
    setLoading(false)
  }, [user, type])

  useEffect(() => { fetch() }, [fetch])

  const saveModel = async (model: Partial<Omit<EquipmentModel, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { type: string; brand: string; model: string }) => {
    if (!user) return { error: 'Não autenticado' }
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const { data: existing } = await supabase
      .from('equipment_models')
      .select('id')
      .eq('type', model.type)
      .eq('brand', model.brand)
      .eq('model', model.model)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      const { error } = await supabase.from('equipment_models').update(model).eq('id', existing.id)
      if (error) return { error: translateError(error) }
    } else {
      const { error } = await supabase.from('equipment_models').insert({ ...model, user_id: user.id })
      if (error) return { error: translateError(error) }
    }
    await fetch()
    return { error: null }
  }

  return { models, loading, saveModel, refetch: fetch }
}
