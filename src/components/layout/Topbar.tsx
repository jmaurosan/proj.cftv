import { useLocation } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const pageTitles: Record<string, string> = {
  '/': 'Painel',
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
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Sistema CFTV'

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onMenuClick()
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
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
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
