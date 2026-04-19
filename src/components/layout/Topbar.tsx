import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Building2, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useClient } from '../../contexts/ClientContext'

const pageTitles: Record<string, string> = {
  '/': 'Painel',
  '/clientes': 'Clientes',
  '/dvrs': 'DVRs',
  '/cameras': 'Câmeras',
  '/baluns': 'Power Baluns',
  '/switches': 'Switches',
  '/credenciais': 'Credenciais',
  '/visualizacao': 'Visualização',
  '/relatorios': 'Relatórios',
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, signOut } = useAuth()
  const { selectedClientId, selectedClientName, clearSelectedClient } = useClient()
  const location = useLocation()
  const navigate = useNavigate()
  const title = pageTitles[location.pathname] || 'Sistema CFTV'

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onMenuClick()
  }

  const handleClearClient = () => {
    clearSelectedClient()
    navigate('/clientes')
  }

  return (
    <header className="h-16 bg-bg-secondary border-b border-border-light flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMenuClick}
          className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors lg:hidden touch-manipulation"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          {selectedClientId && selectedClientName && location.pathname !== '/clientes' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {selectedClientName}
              </span>
              <button
                onClick={handleClearClient}
                className="text-text-muted hover:text-danger transition-colors"
                title="Trocar cliente"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-muted hidden sm:block">{user?.email}</span>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
