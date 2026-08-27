import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SITE_TYPES } from '../lib/constants'
import type { InstallationSiteType } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'

export interface SiteTypeOption {
  value: string
  label: string
  isCustom: boolean
  isActive: boolean
  id?: string
}

export function useSiteTypes() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [customTypes, setCustomTypes] = useState<InstallationSiteType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!selectedClientId) {
      setCustomTypes([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('installation_site_types')
      .select('*')
      .eq('client_id', selectedClientId)
      .order('name')
    if (queryError) setError(translateError(queryError))
    else {
      setError(null)
      setCustomTypes((data as InstallationSiteType[]) ?? [])
    }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const options = useMemo<SiteTypeOption[]>(() => [
    ...SITE_TYPES.map((type) => ({ ...type, isCustom: false, isActive: true })),
    ...customTypes.map((type) => ({
      value: type.type_key,
      label: type.name,
      isCustom: true,
      isActive: type.is_active,
      id: type.id,
    })),
  ].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })), [customTypes])

  const create = async (name: string) => {
    if (!user || !selectedClientId) return { error: 'Selecione um cliente antes de criar o tipo.' }
    const { error: insertError } = await supabase.from('installation_site_types').insert({
      client_id: selectedClientId,
      user_id: user.id,
      name: name.trim(),
    })
    if (insertError) return { error: translateError(insertError) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: { name?: string; is_active?: boolean }) => {
    const { error: updateError } = await supabase
      .from('installation_site_types')
      .update(payload)
      .eq('id', id)
    if (updateError) return { error: translateError(updateError) }
    await fetch()
    return { error: null }
  }

  return { customTypes, options, loading, error, create, update, refetch: fetch }
}
