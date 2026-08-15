import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Credential, CredentialInsert, CredentialUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'
import { decryptSecret, encryptSecret } from '../lib/credentialEncryption'

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
    if (error) {
      setError(translateError(error))
    } else {
      const decrypted = await Promise.all((data as Credential[]).map(async (credential) => ({
        ...credential,
        password: (await decryptSecret(credential.password)) ?? '',
      })))
      setData(decrypted as Credential[])
    }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<CredentialInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId && !(payload as { client_id?: string | null }).client_id) return { error: 'Selecione um cliente antes de cadastrar credencial' }
    const encryptedPassword = await encryptSecret(payload.password)
    const finalPayload = {
      ...payload,
      password: encryptedPassword ?? '',
      user_id: user.id,
      client_id: (payload as { client_id?: string | null }).client_id ?? selectedClientId ?? null,
    }
    const { error } = await supabase.from('credentials').insert(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CredentialUpdate) => {
    const sanitizedPayload = payload.password ? { ...payload, password: await encryptSecret(payload.password) } : payload
    const { error } = await supabase.from('credentials').update(sanitizedPayload).eq('id', id)
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
