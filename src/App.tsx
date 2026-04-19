import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DvrsPage from './pages/DvrsPage'
import CamerasPage from './pages/CamerasPage'
import BalunsPage from './pages/BalunsPage'
import SwitchesPage from './pages/SwitchesPage'
import CredentialsPage from './pages/CredentialsPage'
import ViewerPage from './pages/ViewerPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dvrs" element={<DvrsPage />} />
              <Route path="/cameras" element={<CamerasPage />} />
              <Route path="/baluns" element={<BalunsPage />} />
              <Route path="/switches" element={<SwitchesPage />} />
              <Route path="/credenciais" element={<CredentialsPage />} />
              <Route path="/visualizacao" element={<ViewerPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
