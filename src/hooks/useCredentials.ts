import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Credential, CredentialInsert, CredentialUpdate } from '../lib/types'
import { useAuth } from './useAuth'

export function useCredentials() {
  const { user } = useAuth()
  const [data, setData] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setData(data as Credential[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<CredentialInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    const { error } = await supabase.from('credentials').insert({ ...payload, user_id: user.id })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CredentialUpdate) => {
    const { error } = await supabase.from('credentials').update(payload).eq('id', id)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', id)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
