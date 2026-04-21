import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
      />
      {/* Content area - margin adjusts based on sidebar state on desktop */}
      <div
        className={`transition-all duration-300 min-h-screen flex flex-col
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}
          ml-0
        `}
      >
        <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
