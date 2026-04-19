import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CableConnection } from '../lib/types'
import { useAuth } from './useAuth'

export function useCableConnection(cameraId: string) {
  const { user } = useAuth()
  const [data, setData] = useState<CableConnection | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cable_connections')
      .select('*')
      .eq('camera_id', cameraId)
      .maybeSingle()
    setData(data as CableConnection | null)
    setLoading(false)
  }, [cameraId])

  const save = async (payload: Record<string, unknown>) => {
    if (!user) return { error: 'Não autenticado' }

    if (data) {
      // Update existing
      const { error } = await supabase
        .from('cable_connections')
        .update(payload)
        .eq('id', data.id)
      if (error) return { error: error.message }
    } else {
      // Insert new
      const { error } = await supabase
        .from('cable_connections')
        .insert({ ...payload, camera_id: cameraId, user_id: user.id })
      if (error) return { error: error.message }
    }
    await fetch()
    return { error: null }
  }

  const remove = async () => {
    if (!data) return { error: null }
    const { error } = await supabase
      .from('cable_connections')
      .delete()
      .eq('id', data.id)
    if (error) return { error: error.message }
    setData(null)
    return { error: null }
  }

  return { data, loading, save, remove, fetch }
}
