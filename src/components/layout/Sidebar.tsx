import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Server,
  Camera,
  Cable,
  Network,
  Wifi,
  KeyRound,
  FileText,
  Shield,
  ChevronLeft,
  X,
  Building2,
  ListOrdered,
  BookOpen,
  BatteryCharging,
  FolderKanban,
  MonitorPlay,
  Monitor,
  ServerCog,
  MapPin,
  ClipboardCheck,
  Stethoscope,
  HardDrive,
  Waypoints,
  History,
  ChevronDown,
  Settings,
} from 'lucide-react'

const navGroups = [
  { id: 'overview', label: 'Visão geral', items: [{ to: '/', label: 'Painel', icon: LayoutDashboard }, { to: '/clientes', label: 'Clientes', icon: Building2 }] },
  { id: 'project', label: 'Projeto', items: [{ to: '/locais', label: 'Locais', icon: MapPin }, { to: '/topologia', label: 'Diagrama da instalação', icon: Network }, { to: '/plano-ips', label: 'Plano de IPs', icon: Waypoints }] },
  { id: 'equipment', label: 'Equipamentos', items: [{ to: '/cameras', label: 'Câmeras', icon: Camera }, { to: '/dvrs', label: 'DVRs e NVRs', icon: Server }, { to: '/switches', label: 'Switches', icon: Network }, { to: '/roteadores', label: 'Roteadores', icon: Wifi }, { to: '/baluns', label: 'Power Baluns', icon: Cable }, { to: '/racks', label: 'Racks e Quadros', icon: ServerCog }, { to: '/monitores', label: 'Monitores', icon: Monitor }, { to: '/energia-documentos', label: 'Nobreaks', icon: BatteryCharging }] },
  { id: 'field', label: 'Campo e operação', items: [{ to: '/mapeamento', label: 'Canais e vínculos', icon: ListOrdered }, { to: '/cabos', label: 'Cabos', icon: Cable }, { to: '/crimpagem', label: 'Crimpagem', icon: BookOpen }, { to: '/comissionamento', label: 'Comissionamento', icon: ClipboardCheck }, { to: '/diagnostico-rede', label: 'Diagnóstico de rede', icon: Stethoscope }, { to: '/visualizacao-local', label: 'Visualização local', icon: MonitorPlay }, { to: '/manutencoes', label: 'Manutenções', icon: History }] },
  { id: 'docs', label: 'Documentação', items: [{ to: '/armazenamento', label: 'Armazenamento', icon: HardDrive }, { to: '/documentos-midias', label: 'Documentos e mídias', icon: FolderKanban }, { to: '/relatorios', label: 'Relatórios', icon: FileText }] },
  { id: 'admin', label: 'Administração', items: [{ to: '/credenciais', label: 'Credenciais', icon: KeyRound }, { to: '/empresa', label: 'Empresa e identidade', icon: Settings }] },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
  companyName?: string
  logoUrl?: string | null
}

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose, companyName = 'Sistema CFTV', logoUrl }: SidebarProps) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(navGroups.map(group => [group.id, true])))

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
            <div className="w-9 h-9 bg-bg-primary border border-border-light rounded-md flex items-center justify-center shrink-0 overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain p-1" /> : <Shield className="w-4 h-4 text-accent" />}
            </div>
            <span 
              className={`font-bold text-text-primary text-sm whitespace-nowrap transition-opacity duration-200
                ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
              `}
            >
              {companyName}
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

        <nav className="flex-1 py-3 px-2 space-y-2 overflow-y-auto overflow-x-hidden">
          {navGroups.map(group => <section key={group.id}>
            <button type="button" onClick={() => setOpenGroups(current => ({ ...current, [group.id]: !current[group.id] }))} className={`w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-text-muted hover:text-text-secondary ${collapsed ? 'flex lg:hidden' : 'flex'}`}><span>{group.label}</span><ChevronDown className={`w-3 h-3 transition-transform ${openGroups[group.id] ? '' : '-rotate-90'}`} /></button>
            {(collapsed || openGroups[group.id]) && <div className="space-y-0.5">{group.items.map(item => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              return <NavLink key={item.to} to={item.to} onClick={onMobileClose} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-accent/10 text-accent border-l-2 border-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/40 border-l-2 border-transparent'}`} title={collapsed ? item.label : undefined}><item.icon className="w-4 h-4 shrink-0" /><span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>{item.label}</span></NavLink>
            })}</div>}
          </section>)}
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
