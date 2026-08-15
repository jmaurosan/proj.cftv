import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Dvr, DvrInsert, DvrUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'
import { validateDvrConflicts } from '../lib/connectionValidation'
import { decryptSecret, encryptSecret } from '../lib/credentialEncryption'

const getMissingColumn = (error: unknown) => {
  const message = String((error as { message?: string })?.message || error || '')
  if (!message.toLowerCase().includes('schema cache')) return null
  return message.match(/could not find the ['"]([^'"]+)['"] column/i)?.[1] ?? null
}

const insertWithSchemaFallback = async (payload: Record<string, unknown>) => {
  const compatiblePayload = { ...payload }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from('dvrs').insert(compatiblePayload)
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
    const { error } = await supabase.from('dvrs').update(compatiblePayload).eq('id', id)
    if (!error) return null
    const missingColumn = getMissingColumn(error)
    if (!missingColumn || !(missingColumn in compatiblePayload)) return error
    delete compatiblePayload[missingColumn]
  }
  return new Error('Não foi possível compatibilizar a atualização com a estrutura atual do banco.')
}

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
    if (error) {
      setError(translateError(error))
    } else {
      const decrypted = await Promise.all((data as Dvr[]).map(async (dvr) => ({
        ...dvr,
        password: await decryptSecret(dvr.password),
        hik_connect_password: await decryptSecret(dvr.hik_connect_password),
      })))
      setData(decrypted)
    }
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
    const [encryptedPassword, encryptedHikPassword] = await Promise.all([
      encryptSecret(payload.password),
      encryptSecret(payload.hik_connect_password),
    ])
    const finalPayload = {
      ...payload,
      password: encryptedPassword ?? null,
      hik_connect_password: encryptedHikPassword ?? null,
      user_id: user.id,
      client_id: payload.client_id ?? selectedClientId ?? null,
    }
    const conflict = await validateBeforeSave(finalPayload)
    if (conflict) return { error: conflict }
    const error = await insertWithSchemaFallback(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: DvrUpdate) => {
    const current = data.find((dvr) => dvr.id === id)
    const conflict = await validateBeforeSave({ ...current, ...payload }, id)
    if (conflict) return { error: conflict }

    const sanitizedPayload = {
      ...payload,
      password: payload.password ? await encryptSecret(payload.password) : payload.password,
      hik_connect_password: payload.hik_connect_password ? await encryptSecret(payload.hik_connect_password) : payload.hik_connect_password,
    }

    const error = await updateWithSchemaFallback(id, sanitizedPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('dvrs').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
