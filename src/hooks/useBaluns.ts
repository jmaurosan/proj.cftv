import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { PowerBalun, PowerBalunInsert, PowerBalunUpdate } from '../lib/types'
import { useAuth } from './useAuth'

export function useBaluns() {
  const { user } = useAuth()
  const [data, setData] = useState<PowerBalun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('power_baluns')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setData(data as PowerBalun[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<PowerBalunInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    const { error } = await supabase.from('power_baluns').insert({ ...payload, user_id: user.id })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: PowerBalunUpdate) => {
    const { error } = await supabase.from('power_baluns').update(payload).eq('id', id)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('power_baluns').delete().eq('id', id)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
