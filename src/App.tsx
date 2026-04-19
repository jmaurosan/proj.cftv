import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ClientProvider } from './contexts/ClientContext'
import { ToastProvider } from './components/ui/Toast'
import AppLayout from './components/layout/AppLayout'
import PWAUpdatePrompt from './components/ui/PWAUpdatePrompt'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DvrsPage from './pages/DvrsPage'
import CamerasPage from './pages/CamerasPage'
import BalunsPage from './pages/BalunsPage'
import SwitchesPage from './pages/SwitchesPage'
import CredentialsPage from './pages/CredentialsPage'
import ViewerPage from './pages/ViewerPage'
import ClientsPage from './pages/ClientsPage'
import LoadingSpinner from './components/ui/LoadingSpinner'

const ReportsPage = lazy(() => import('./pages/ReportsPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clientes" element={<ClientsPage />} />
                <Route path="/dvrs" element={<DvrsPage />} />
                <Route path="/cameras" element={<CamerasPage />} />
                <Route path="/baluns" element={<BalunsPage />} />
                <Route path="/switches" element={<SwitchesPage />} />
                <Route path="/credenciais" element={<CredentialsPage />} />
                <Route path="/visualizacao" element={<ViewerPage />} />
                <Route path="/relatorios" element={<Suspense fallback={<LoadingSpinner />}><ReportsPage /></Suspense>} />
              </Route>
            </Routes>
            <PWAUpdatePrompt />
          </ToastProvider>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
