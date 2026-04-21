import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../lib/types'
import { useAuth } from './useAuth'

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) {
      setError(error.message)
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'Não autenticado' }
    const { data, error } = await supabase.from('clients').insert({ ...client, user_id: user.id }).select().single()
    if (error) return { error: error.message }
    await fetchClients()
    return { data, error: null }
  }

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(updates).eq('id', id)
    if (error) return { error: error.message }
    await fetchClients()
    return { error: null }
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return { error: error.message }
    await fetchClients()
    return { error: null }
  }

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient }
}
