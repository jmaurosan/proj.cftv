import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Server,
  Camera,
  Cable,
  Network,
  KeyRound,
  Monitor,
  Shield,
  ChevronLeft,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/dvrs', label: 'DVRs', icon: Server },
  { to: '/cameras', label: 'Câmeras', icon: Camera },
  { to: '/baluns', label: 'Power Baluns', icon: Cable },
  { to: '/switches', label: 'Switches', icon: Network },
  { to: '/credenciais', label: 'Credenciais', icon: KeyRound },
  { to: '/visualizacao', label: 'Visualização', icon: Monitor },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-light flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border-light shrink-0">
        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-accent" />
        </div>
        {!collapsed && (
          <span className="font-bold text-text-primary text-sm whitespace-nowrap">Sistema CFTV</span>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-2 py-3 border-t border-border-light shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span className="ml-3 text-sm">Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
