import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Server,
  Camera,
  Cable,
  Network,
  KeyRound,
  Monitor,
  FileText,
  Shield,
  ChevronLeft,
  X,
  Building2,
  ListOrdered,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Building2 },
  { to: '/dvrs', label: 'DVRs', icon: Server },
  { to: '/cameras', label: 'Câmeras', icon: Camera },
  { to: '/mapeamento', label: 'Mapeamento', icon: ListOrdered },
  { to: '/baluns', label: 'Power Baluns', icon: Cable },
  { to: '/switches', label: 'Switches', icon: Network },
  { to: '/credenciais', label: 'Credenciais', icon: KeyRound },
  { to: '/visualizacao', label: 'Visualização', icon: Monitor },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-light flex flex-col z-50
          transition-transform duration-300 ease-in-out
          w-60
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'lg:w-16' : 'lg:w-60'}
        `}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border-light shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <span 
              className={`font-bold text-text-primary text-sm whitespace-nowrap transition-opacity duration-200
                ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
              `}
            >
              Sistema CFTV
            </span>
          </div>
          {/* Mobile close button - only visible on mobile */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span 
                  className={`whitespace-nowrap transition-all duration-200 overflow-hidden
                    ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
                  `}
                >
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse button - desktop only */}
        <div className="px-2 py-3 border-t border-border-light shrink-0 hidden lg:block">
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50 transition-colors"
          >
            <ChevronLeft 
              className={`w-4 h-4 transition-transform duration-300 shrink-0 ${collapsed ? 'rotate-180' : ''}`} 
            />
            <span 
              className={`ml-3 text-sm whitespace-nowrap transition-all duration-200 overflow-hidden
                ${collapsed ? 'lg:opacity-0 lg:w-0 lg:ml-0' : 'opacity-100'}
              `}
            >
              Recolher
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
