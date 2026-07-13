import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { supabase } from '../lib/supabase'
import { translateError } from '../lib/errorTranslator'
import type { Rack, RackInsert, RackUpdate } from '../lib/types'

export function useRacks() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<Rack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!selectedClientId) { setData([]); setLoading(false); return }
    setLoading(true)
    const result = await supabase.from('racks').select('*').eq('client_id', selectedClientId).order('name')
    if (result.error) setError(translateError(result.error)); else { setData((result.data || []) as Rack[]); setError(null) }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<RackInsert, 'client_id'> & { client_id?: string }) => {
    if (!user || !selectedClientId) return { error: 'Selecione um cliente antes de cadastrar o rack' }
    const topologyId = payload.topology_id || `rack-${crypto.randomUUID()}`
    const result = await supabase.from('racks').insert({ ...payload, topology_id: topologyId, client_id: selectedClientId, user_id: user.id })
    if (result.error) return { error: translateError(result.error) }
    await fetch(); return { error: null }
  }
  const update = async (id: string, payload: RackUpdate) => {
    const result = await supabase.from('racks').update(payload).eq('id', id)
    if (result.error) return { error: translateError(result.error) }
    await fetch(); return { error: null }
  }
  const remove = async (id: string) => {
    const result = await supabase.from('racks').delete().eq('id', id)
    if (result.error) return { error: translateError(result.error) }
    await fetch(); return { error: null }
  }
  return { data, loading, error, create, update, remove, refetch: fetch }
}
