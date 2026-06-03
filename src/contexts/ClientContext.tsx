import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

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

  useEffect(() => {
    const storedId = localStorage.getItem('selectedClientId')
    const storedName = localStorage.getItem('selectedClientName')
    if (storedId) {
      setSelectedClientId(storedId)
      setSelectedClientName(storedName)
    }
  }, [])

  const setSelectedClient = (id: string | null, name: string | null) => {
    if (id) {
      localStorage.setItem('selectedClientId', id)
      localStorage.setItem('selectedClientName', name || '')
    } else {
      localStorage.removeItem('selectedClientId')
      localStorage.removeItem('selectedClientName')
    }
    setSelectedClientId(id)
    setSelectedClientName(name)
  }

  const clearSelectedClient = () => {
    localStorage.removeItem('selectedClientId')
    localStorage.removeItem('selectedClientName')
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
