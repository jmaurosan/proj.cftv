import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ClientProvider } from './contexts/ClientContext'
import { ToastProvider } from './components/ui/Toast'
import AppLayout from './components/layout/AppLayout'
import PWAUpdatePrompt from './components/ui/PWAUpdatePrompt'
import LoadingSpinner from './components/ui/LoadingSpinner'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DvrsPage = lazy(() => import('./pages/DvrsPage'))
const CamerasPage = lazy(() => import('./pages/CamerasPage'))
const LocalViewerPage = lazy(() => import('./pages/LocalViewerPage'))
const BalunsPage = lazy(() => import('./pages/BalunsPage'))
const CablesPage = lazy(() => import('./pages/CablesPage'))
const SitesPage = lazy(() => import('./pages/SitesPage'))
const SwitchesPage = lazy(() => import('./pages/SwitchesPage'))
const RoutersPage = lazy(() => import('./pages/RoutersPage'))
const RacksPage = lazy(() => import('./pages/RacksPage'))
const MonitorsPage = lazy(() => import('./pages/MonitorsPage'))
const CredentialsPage = lazy(() => import('./pages/CredentialsPage'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ChannelMappingPage = lazy(() => import('./pages/ChannelMappingPage'))
const CrimpPage = lazy(() => import('./pages/CrimpPage'))
const TopologyPage = lazy(() => import('./pages/TopologyPage'))
const PowerProtectionPage = lazy(() => import('./pages/PowerProtectionPage'))
const DocumentsMediaPage = lazy(() => import('./pages/DocumentsMediaPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const CommissioningPage = lazy(() => import('./pages/CommissioningPage'))
const NetworkDiagnosticsPage = lazy(() => import('./pages/NetworkDiagnosticsPage'))
const StoragePlanningPage = lazy(() => import('./pages/StoragePlanningPage'))
const IpPlanningPage = lazy(() => import('./pages/IpPlanningPage'))
const MaintenanceHistoryPage = lazy(() => import('./pages/MaintenanceHistoryPage'))
const CompanySettingsPage = lazy(() => import('./pages/CompanySettingsPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <ToastProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clientes" element={<ClientsPage />} />
                  <Route path="/dvrs" element={<DvrsPage />} />
                  <Route path="/cameras" element={<CamerasPage />} />
                  <Route path="/visualizacao-local" element={<LocalViewerPage />} />
                  <Route path="/mapeamento" element={<ChannelMappingPage />} />
                  <Route path="/baluns" element={<BalunsPage />} />
                  <Route path="/cabos" element={<CablesPage />} />
                  <Route path="/locais" element={<SitesPage />} />
                  <Route path="/switches" element={<SwitchesPage />} />
                  <Route path="/roteadores" element={<RoutersPage />} />
                  <Route path="/racks" element={<RacksPage />} />
                  <Route path="/monitores" element={<MonitorsPage />} />
                  <Route path="/credenciais" element={<CredentialsPage />} />
                  <Route path="/crimpagem" element={<CrimpPage />} />
                  <Route path="/topologia" element={<TopologyPage />} />
                  <Route path="/relatorios" element={<ReportsPage />} />
                  <Route path="/comissionamento" element={<CommissioningPage />} />
                  <Route path="/diagnostico-rede" element={<NetworkDiagnosticsPage />} />
                  <Route path="/armazenamento" element={<StoragePlanningPage />} />
                  <Route path="/plano-ips" element={<IpPlanningPage />} />
                  <Route path="/manutencoes" element={<MaintenanceHistoryPage />} />
                  <Route path="/empresa" element={<CompanySettingsPage />} />
                  <Route path="/energia-documentos" element={<PowerProtectionPage />} />
                  <Route path="/documentos-midias" element={<DocumentsMediaPage />} />
                </Route>
              </Routes>
            </Suspense>
            <PWAUpdatePrompt />
          </ToastProvider>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
