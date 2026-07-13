import { useCallback, useEffect, useState } from 'react'
import type { EquipmentOption } from '../lib/projectAssets'
import { supabase } from '../lib/supabase'
import { createTimedCache } from '../lib/timedCache'
import { translateError } from '../lib/errorTranslator'

const EQUIPMENT_TABLES = [
  ['camera', 'Câmera', 'cameras'],
  ['dvr', 'DVR', 'dvrs'],
  ['switch', 'Switch', 'switches'],
  ['router', 'Roteador', 'routers'],
  ['balun', 'Balun', 'power_baluns'],
  ['monitor', 'Monitor', 'monitors'],
] as const

const equipmentOptionsCache = createTimedCache<EquipmentOption[]>(2 * 60 * 1000)

export function useEquipmentOptions(clientId: string | null) {
  const [options, setOptions] = useState<EquipmentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (!clientId) {
      setOptions([])
      setLoading(false)
      setError(null)
      return
    }
    if (!force) {
      const cached = equipmentOptionsCache.get(clientId)
      if (cached) {
        setOptions(cached)
        setLoading(false)
        setError(null)
        return
      }
    }
    setLoading(true)
    try {
      const groups = await Promise.all(EQUIPMENT_TABLES.map(async ([type, typeLabel, table]) => {
        const { data, error: queryError } = await supabase.from(table).select('id, name').eq('client_id', clientId).order('name')
        if (queryError) throw queryError
        return (data || []).map((item) => ({ id: item.id, name: item.name, type, typeLabel }))
      }))
      const next = groups.flat()
      equipmentOptionsCache.set(clientId, next)
      setOptions(next)
      setError(null)
    } catch (loadError) {
      setError(translateError(loadError))
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { load() }, [load])

  return { options, loading, error, refresh: () => load(true) }
}
