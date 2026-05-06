import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EquipmentModel } from '../lib/types'
import { useAuth } from './useAuth'

export function useEquipmentModels(type?: string) {
  const { user } = useAuth()
  const [models, setModels] = useState<EquipmentModel[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let query = supabase.from('equipment_models').select('*').eq('user_id', user.id).order('brand')
    if (type) query = query.eq('type', type)
    const { data, error } = await query
    if (!error) setModels((data as EquipmentModel[]) || [])
    setLoading(false)
  }, [user, type])

  useEffect(() => { fetch() }, [fetch])

  const saveModel = async (model: Partial<Omit<EquipmentModel, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { type: string; brand: string; model: string }) => {
    if (!user) return { error: 'Não autenticado' }
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
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('equipment_models').insert({ ...model, user_id: user.id })
      if (error) return { error: error.message }
    }
    await fetch()
    return { error: null }
  }

  return { models, loading, saveModel, refetch: fetch }
}
