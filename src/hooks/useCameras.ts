import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Camera, CameraInsert, CameraUpdate } from '../lib/types'
import { useAuth } from './useAuth'

export function useCameras() {
  const { user } = useAuth()
  const [data, setData] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cameras')
      .select('*, dvrs(name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setData(data as Camera[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<CameraInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    const { error } = await supabase.from('cameras').insert({ ...payload, user_id: user.id })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CameraUpdate) => {
    const { error } = await supabase.from('cameras').update(payload).eq('id', id)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('cameras').delete().eq('id', id)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
