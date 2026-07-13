import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Credential, CredentialInsert, CredentialUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'

export function useCredentials() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!selectedClientId) {
      setData([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    let query = supabase.from('credentials').select('*').order('created_at', { ascending: false })
    query = query.eq('client_id', selectedClientId)
    const { data, error } = await query
    if (error) setError(translateError(error))
    else setData(data as Credential[])
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<CredentialInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId && !(payload as { client_id?: string | null }).client_id) return { error: 'Selecione um cliente antes de cadastrar credencial' }
    const finalPayload = {
      ...payload,
      user_id: user.id,
      client_id: (payload as { client_id?: string | null }).client_id ?? selectedClientId ?? null,
    }
    const { error } = await supabase.from('credentials').insert(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CredentialUpdate) => {
    const { error } = await supabase.from('credentials').update(payload).eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
