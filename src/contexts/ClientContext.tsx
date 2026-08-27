/* eslint-disable react-refresh/only-export-components -- provider e hook formam uma única API de cliente */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type ClientRole = 'owner' | 'operator' | 'viewer'

interface ClientContextType {
  selectedClientId: string | null
  selectedClientName: string | null
  selectedClientRole: ClientRole | null
  roleLoading: boolean
  canWrite: boolean
  setSelectedClient: (id: string | null, name: string | null) => void
  clearSelectedClient: () => void
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [selectedClientRole, setSelectedClientRole] = useState<ClientRole | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!selectedClientId) {
      setSelectedClientRole(null)
      setRoleLoading(false)
      return () => { active = false }
    }

    setRoleLoading(true)
    void supabase
      .from('client_members')
      .select('role')
      .eq('client_id', selectedClientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const role = data?.role
        setSelectedClientRole(role === 'owner' || role === 'operator' || role === 'viewer' ? role : null)
        setRoleLoading(false)
      })

    return () => { active = false }
  }, [selectedClientId])

  const setSelectedClient = (id: string | null, name: string | null) => {
    setSelectedClientId(id)
    setSelectedClientName(name)
    setSelectedClientRole(null)
  }

  const clearSelectedClient = () => {
    setSelectedClientId(null)
    setSelectedClientName(null)
    setSelectedClientRole(null)
  }

  return (
    <ClientContext.Provider
      value={{
        selectedClientId,
        selectedClientName,
        selectedClientRole,
        roleLoading,
        canWrite: selectedClientRole === 'owner' || selectedClientRole === 'operator',
        setSelectedClient,
        clearSelectedClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider')
  }
  return context
}
