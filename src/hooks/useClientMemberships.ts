import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type ClientMembershipRole = 'owner' | 'operator' | 'viewer'

export function useClientMemberships() {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState<Record<string, ClientMembershipRole>>({})
  const [loading, setLoading] = useState(true)

  const isAdmin = Boolean((user?.app_metadata as { role?: string } | undefined)?.role === 'admin')

  const loadMemberships = useCallback(async () => {
    if (!user) {
      setMemberships({})
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('client_members')
      .select('client_id, role')
      .eq('user_id', user.id)

    if (error) {
      setMemberships({})
      setLoading(false)
      return
    }

    const nextMemberships = (data ?? []).reduce<Record<string, ClientMembershipRole>>((acc, entry) => {
      if (entry.client_id && entry.role) {
        acc[entry.client_id] = entry.role as ClientMembershipRole
      }
      return acc
    }, {})

    setMemberships(nextMemberships)
    setLoading(false)
  }, [user])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      await loadMemberships()
      if (!isActive) {
        setLoading(false)
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [loadMemberships])

  const hasAccess = (clientId: string | null | undefined) => {
    if (!clientId) return false
    if (isAdmin) return true
    return Boolean(memberships[clientId])
  }

  const getRole = (clientId: string | null | undefined): ClientMembershipRole | null => {
    if (!clientId) return null
    if (isAdmin) return 'owner'
    return memberships[clientId] ?? null
  }

  const canWrite = (clientId: string | null | undefined) => {
    const role = getRole(clientId)
    return role === 'owner' || role === 'operator'
  }

  return { memberships, loading, isAdmin, hasAccess, getRole, canWrite }
}
