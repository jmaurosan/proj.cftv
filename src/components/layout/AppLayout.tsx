import { useCallback, useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LoadingSpinner from '../ui/LoadingSpinner'
import { supabase } from '../../lib/supabase'
import { DEFAULT_COMPANY_BRANDING, getCompanyLogoUrl, type CompanyBranding } from '../../lib/companyBranding'
import SchemaCompatibilityBanner from '../ui/SchemaCompatibilityBanner'

export default function AppLayout() {
  const { user, loading } = useAuth()
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
        <main className="flex-1 p-3 sm:p-4 lg:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
