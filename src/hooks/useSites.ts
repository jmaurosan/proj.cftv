import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { InstallationSite, InstallationSiteInsert, InstallationSiteUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'

export function useSites() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<InstallationSite[]>([])
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
    const { data: rows, error: err } = await supabase
      .from('installation_sites')
      .select('*')
      .eq('client_id', selectedClientId)
      .order('name')
    if (err) setError(translateError(err))
    else {
      setError(null)
      setData((rows as InstallationSite[]) || [])
    }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: Omit<InstallationSiteInsert, 'user_id' | 'client_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId) return { error: 'Selecione um cliente antes de cadastrar site' }
    const finalPayload = { ...payload, user_id: user.id, client_id: selectedClientId }
    const { data: inserted, error: insErr } = await supabase
      .from('installation_sites')
      .insert(finalPayload)
      .select()
      .single()
    if (insErr) return { error: translateError(insErr) }
    await fetch()
    return { error: null, id: (inserted as InstallationSite).id }
  }

  const update = async (id: string, payload: InstallationSiteUpdate) => {
    // Impede que um site vire pai de si mesmo ou de um descendente (loop hierárquico).
    if (payload.parent_site_id) {
      if (payload.parent_site_id === id) return { error: 'Um site não pode ser pai de si mesmo.' }
      if (isDescendant(id, payload.parent_site_id, data)) {
        return { error: 'Não é possível vincular a um site que já descende deste.' }
      }
    }
    const { error: updErr } = await supabase.from('installation_sites').update(payload).eq('id', id)
    if (updErr) return { error: translateError(updErr) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error: delErr } = await supabase.from('installation_sites').delete().eq('id', id)
    if (delErr) return { error: translateError(delErr) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}

/**
 * Verifica se `candidateParentId` é descendente de `siteId` na hierarquia.
 * Usado para impedir loops ao editar parent_site_id.
 */
function isDescendant(siteId: string, candidateParentId: string, sites: InstallationSite[]): boolean {
  let current = sites.find((s) => s.id === candidateParentId)
  const visited = new Set<string>()
  while (current) {
    if (visited.has(current.id)) return false // ciclo pré-existente, para
    if (current.id === siteId) return true
    if (current.parent_site_id === siteId) return true
    visited.add(current.id)
    current = current.parent_site_id ? sites.find((s) => s.id === current!.parent_site_id) : undefined
  }
  return false
}
