import { useCallback, useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LoadingSpinner from '../ui/LoadingSpinner'
import { supabase } from '../../lib/supabase'
import { DEFAULT_COMPANY_BRANDING, getCompanyLogoUrl, type CompanyBranding } from '../../lib/companyBranding'
import SchemaCompatibilityBanner from '../ui/SchemaCompatibilityBanner'
import { Eye } from 'lucide-react'
import { useClient } from '../../contexts/ClientContext'
import { useToast } from '../ui/Toast'
import { isMutationAction } from '../../lib/demoReadOnly'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { selectedClientRole } = useClient()
  const { toast } = useToast()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [branding, setBranding] = useState<CompanyBranding>(DEFAULT_COMPANY_BRANDING)

  const loadBranding = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('company_profiles').select('*').eq('user_id', user.id).maybeSingle()
    setBranding(data ? data as CompanyBranding : DEFAULT_COMPANY_BRANDING)
  }, [user])

  useEffect(() => {
    void loadBranding()
    window.addEventListener('company-branding-updated', loadBranding)
    return () => window.removeEventListener('company-branding-updated', loadBranding)
  }, [loadBranding])

  const handleMenuClick = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setSidebarCollapsed(value => !value)
    else setMobileOpen(value => !value)
  }

  const isReadOnly = selectedClientRole === 'viewer'

  const blockReadOnlySubmit = (event: FormEvent) => {
    if (!isReadOnly) return
    event.preventDefault()
    event.stopPropagation()
    toast('Acesso de demonstração: alterações estão bloqueadas.', 'error')
  }

  const blockReadOnlyAction = (event: MouseEvent) => {
    if (!isReadOnly) return
    const target = event.target as HTMLElement
    const action = target.closest('button, [role="button"]') as HTMLElement | null
    if (!action) return
    const label = [action.getAttribute('aria-label'), action.getAttribute('title'), action.textContent]
      .filter(Boolean)
      .join(' ')
      .trim()
    const buttonType = action instanceof HTMLButtonElement ? action.type : ''
    if (!isMutationAction(label, buttonType)) return
    event.preventDefault()
    event.stopPropagation()
    toast('Acesso de demonstração: ação disponível somente para operadores.', 'error')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-bg-primary overflow-x-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setMobileOpen(false)}
        companyName={branding.trade_name || branding.company_name}
        logoUrl={getCompanyLogoUrl(branding.logo_path)}
      />
      {/* Content area - margin adjusts based on sidebar state on desktop */}
      <div
        className={`transition-all duration-300 min-h-screen flex flex-col
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}
          ml-0
        `}
      >
        <Topbar onMenuClick={handleMenuClick} />
        <SchemaCompatibilityBanner />
        {isReadOnly && (
          <div className="mx-3 mt-3 sm:mx-4 lg:mx-6 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text-primary" role="status">
            <Eye className="h-4 w-4 shrink-0 text-accent" />
            <span><strong>Ambiente demonstrativo · Somente leitura.</strong> Explore o Residencial Digixs sem alterar os dados.</span>
          </div>
        )}
        <main
          className="flex-1 p-3 sm:p-4 lg:p-6 w-full"
          onSubmitCapture={blockReadOnlySubmit}
          onClickCapture={blockReadOnlyAction}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
