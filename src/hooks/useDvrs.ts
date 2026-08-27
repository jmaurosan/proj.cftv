import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Dvr, DvrInsert, DvrUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'
import { validateDvrConflicts } from '../lib/connectionValidation'
import { requireCompatibleSchema } from '../lib/schemaCompatibility'

export function useDvrs() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<Dvr[]>([])
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
    let query = supabase.from('dvrs').select('*').order('created_at', { ascending: false })
    query = query.eq('client_id', selectedClientId)
    const { data, error } = await query
    if (error) setError(translateError(error))
    else setData(data as Dvr[])
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const validateBeforeSave = async (candidate: DvrUpdate & { client_id?: string | null }, editingId?: string) => {
    const clientId = candidate.client_id ?? selectedClientId
    if (!clientId) return 'Selecione um cliente antes de cadastrar DVR'
    const { data: currentDvrs, error: validationError } = await supabase
      .from('dvrs')
      .select('id, name, ip_address')
      .eq('client_id', clientId)
    if (validationError) return `Não foi possível validar o DVR: ${translateError(validationError)}`
    return validateDvrConflicts(currentDvrs || [], candidate, editingId)
  }

  const create = async (payload: Omit<DvrInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId && !payload.client_id) return { error: 'Selecione um cliente antes de cadastrar DVR' }
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const finalPayload = {
      ...payload,
      user_id: user.id,
      client_id: payload.client_id ?? selectedClientId ?? null,
    }
    const conflict = await validateBeforeSave(finalPayload)
    if (conflict) return { error: conflict }
    const { error } = await supabase.from('dvrs').insert(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: DvrUpdate) => {
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const current = data.find((dvr) => dvr.id === id)
    const conflict = await validateBeforeSave({ ...current, ...payload }, id)
    if (conflict) return { error: conflict }
    const { error } = await supabase.from('dvrs').update(payload).eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const { error } = await supabase.from('dvrs').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
