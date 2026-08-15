import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../lib/types'
import { useAuth } from './useAuth'
import { translateError } from '../lib/errorTranslator'

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!user) {
      setClients([])
      setLoading(false)
      return
    }

    const isAdmin = Boolean((user.app_metadata as { role?: string } | undefined)?.role === 'admin')

    let result

    if (isAdmin) {
      result = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name')
    } else {
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('client_members')
        .select('client_id')
        .eq('user_id', user.id)

      if (membershipsError) {
        setError(translateError(membershipsError))
        setClients([])
        setLoading(false)
        return
      }

      const accessibleIds = (membershipsData ?? []).map((entry) => entry.client_id).filter(Boolean)

      const ownedResult = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (ownedResult.error) {
        setError(translateError(ownedResult.error))
        setClients([])
        setLoading(false)
        return
      }

      const ownedClients = ownedResult.data ?? []

      if (!accessibleIds.length) {
        setClients(ownedClients)
        setLoading(false)
        return
      }

      const membershipResult = await supabase
        .from('clients')
        .select('*')
        .in('id', accessibleIds)
        .eq('is_active', true)
        .order('name')

      if (membershipResult.error) {
        setError(translateError(membershipResult.error))
        setClients([])
        setLoading(false)
        return
      }

      const merged = [...(ownedClients ?? []), ...(membershipResult.data ?? [])]
      const unique = merged.filter(
        (client, index, array) => array.findIndex((candidate) => candidate.id === client.id) === index,
      )
      setClients(unique)
      setLoading(false)
      return
    }

    if (result.error) {
      setError(translateError(result.error))
    } else {
      setClients(result.data || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'Não autenticado' }
    const { data, error } = await supabase.from('clients').insert({ ...client, user_id: user.id }).select().single()
    if (error) return { error: translateError(error) }
    await fetchClients()
    return { data, error: null }
  }

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(updates).eq('id', id)
    if (error) return { error: translateError(error) }
    await fetchClients()
    return { error: null }
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetchClients()
    return { error: null }
  }

  /**
   * Vincula todos os registros do usuário que estão sem cliente (client_id IS NULL)
   * ao cliente informado. Útil para migrar dados criados antes do isolamento
   * por cliente, ou consolidar registros "órfãos" no cliente atual.
   */
  const assignOrphansToClient = async (clientId: string) => {
    if (!user) return { error: 'Não autenticado', counts: {} }
    const tables = [
      'dvrs',
      'cameras',
      'power_baluns',
      'switches',
      'credentials',
      'cable_connections',
      'routers',
      'internet_connections',
      'network_segments',
    ] as const
    const counts: Record<string, number> = {}
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .update({ client_id: clientId })
        .is('client_id', null)
        .eq('user_id', user.id)
        .select('id')
      if (error) {
        // Algumas tabelas podem não existir em ambientes antigos – ignora 404/42P01
        if (!/(does not exist|42P01)/i.test(error.message)) {
          return { error: translateError(error), counts }
        }
        counts[table] = 0
        continue
      }
      counts[table] = (data as unknown as { id: string }[] | null)?.length ?? 0
    }
    return { error: null, counts }
  }

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient, assignOrphansToClient }
}
