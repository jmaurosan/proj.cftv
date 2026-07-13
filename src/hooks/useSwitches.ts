import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Switch, SwitchInsert, SwitchUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'

const getMissingColumn = (error: unknown) => {
  const message = String((error as { message?: string })?.message || error || '')
  if (!message.toLowerCase().includes('schema cache')) return null
  return message.match(/could not find the ['"]([^'"]+)['"] column/i)?.[1] ?? null
}

const insertWithSchemaFallback = async (payload: Record<string, unknown>) => {
  const compatiblePayload = { ...payload }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from('switches').insert(compatiblePayload)
    if (!error) return null
    const missingColumn = getMissingColumn(error)
    if (!missingColumn || !(missingColumn in compatiblePayload)) return error
    delete compatiblePayload[missingColumn]
  }
  return new Error('Não foi possível compatibilizar o cadastro com a estrutura atual do banco.')
}

const updateWithSchemaFallback = async (id: string, payload: Record<string, unknown>) => {
  const compatiblePayload = { ...payload }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from('switches').update(compatiblePayload).eq('id', id)
    if (!error) return null
    const missingColumn = getMissingColumn(error)
    if (!missingColumn || !(missingColumn in compatiblePayload)) return error
    delete compatiblePayload[missingColumn]
  }
  return new Error('Não foi possível compatibilizar a atualização com a estrutura atual do banco.')
}

export function useSwitches() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<Switch[]>([])
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
    let query = supabase.from('switches').select('*').order('created_at', { ascending: false })
    query = query.eq('client_id', selectedClientId)
    const { data, error } = await query
    if (error) setError(translateError(error))
    else setData(data as Switch[])
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<SwitchInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId && !payload.client_id) return { error: 'Selecione um cliente antes de cadastrar switch' }
    const finalPayload = {
      ...payload,
      user_id: user.id,
      client_id: payload.client_id ?? selectedClientId ?? null,
    }
    const error = await insertWithSchemaFallback(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: SwitchUpdate) => {
    const error = await updateWithSchemaFallback(id, payload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('switches').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
