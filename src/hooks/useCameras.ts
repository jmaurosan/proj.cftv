import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Camera, CameraInsert, CameraUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'

export function useCameras() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('cameras').select('*, dvrs(name)').order('created_at', { ascending: false })
    if (selectedClientId) query = query.eq('client_id', selectedClientId)
    const { data, error } = await query
    if (error) setError(translateError(error))
    else setData(data as Camera[])
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<CameraInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    const finalPayload = {
      ...payload,
      user_id: user.id,
      client_id: payload.client_id ?? selectedClientId ?? null,
    }
    const { error } = await supabase.from('cameras').insert(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CameraUpdate) => {
    const { error } = await supabase.from('cameras').update(payload).eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('cameras').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
