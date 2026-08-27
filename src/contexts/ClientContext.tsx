/* eslint-disable react-refresh/only-export-components -- provider e hook formam uma única API de cliente */
import { createContext, useContext, useState, type ReactNode } from 'react'

interface ClientContextType {
  selectedClientId: string | null
  selectedClientName: string | null
  setSelectedClient: (id: string | null, name: string | null) => void
  clearSelectedClient: () => void
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)

  const setSelectedClient = (id: string | null, name: string | null) => {
    setSelectedClientId(id)
    setSelectedClientName(name)
  }

  const clearSelectedClient = () => {
    setSelectedClientId(null)
    setSelectedClientName(null)
  }

  return (
    <ClientContext.Provider
      value={{ selectedClientId, selectedClientName, setSelectedClient, clearSelectedClient }}
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
