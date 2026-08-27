import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Cable, Download, Network, RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import PingStatusCard, { type DiagnosticAccessMode, type PingDevice, type PingResult } from '../components/ui/PingStatusCard'
import { buildLocalViewerStorageKey } from '../lib/localCameraViewer'
import { useToast } from '../components/ui/Toast'
import NetworkDiagnosticHistory from '../components/network/NetworkDiagnosticHistory'

const DEFAULT_AGENT_URL = 'http://127.0.0.1:8727'

export default function NetworkDiagnosticsPage() {
  const { selectedClientId } = useClient()
  const { toast } = useToast()
  const [devices, setDevices] = useState<PingDevice[]>([])
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL)
  const [agentToken, setAgentToken] = useState('')
  const [accessMode, setAccessMode] = useState<DiagnosticAccessMode>('local')
  const [agentOnline, setAgentOnline] = useState(false)
  const [agentHostname, setAgentHostname] = useState('')
  const [checkingAgent, setCheckingAgent] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  useEffect(() => {
    setAgentUrl(window.localStorage.getItem(buildLocalViewerStorageKey('agent-url', selectedClientId)) || DEFAULT_AGENT_URL)
    setAgentToken(window.sessionStorage.getItem(buildLocalViewerStorageKey('agent-token', selectedClientId)) || '')
    setAgentOnline(false)
  }, [selectedClientId])

  useEffect(() => {
    if (!selectedClientId) {
      setDevices([])
      return
    }
    const loadDevices = async () => {
      const [dvrs, cameras, switches, routers] = await Promise.all([
        supabase.from('dvrs').select('id,name,ip_address').eq('client_id', selectedClientId).not('ip_address', 'is', null),
        supabase.from('cameras').select('id,name,ip_address,connection_type').eq('client_id', selectedClientId).not('ip_address', 'is', null),
        supabase.from('switches').select('id,name,ip_address').eq('client_id', selectedClientId).not('ip_address', 'is', null),
        supabase.from('routers').select('id,name,ip_address').eq('client_id', selectedClientId).not('ip_address', 'is', null),
      ])
      setDevices([
        ...(dvrs.data || []).map(item => ({ id: item.id, name: item.name, ip: item.ip_address!, type: 'DVR' as const })),
        ...(cameras.data || []).filter(item => item.connection_type === 'ip' || item.connection_type === 'wifi').map(item => ({ id: item.id, name: item.name, ip: item.ip_address!, type: 'Câmera' as const })),
        ...(switches.data || []).map(item => ({ id: item.id, name: item.name, ip: item.ip_address!, type: 'Switch' as const })),
        ...(routers.data || []).map(item => ({ id: item.id, name: item.name, ip: item.ip_address!, type: 'Roteador' as const })),
      ])
    }
    void loadDevices()
  }, [selectedClientId])

  const normalizedAgentUrl = useMemo(() => agentUrl.trim().replace(/\/+$/, ''), [agentUrl])

  const saveSettings = () => {
    window.localStorage.setItem(buildLocalViewerStorageKey('agent-url', selectedClientId), normalizedAgentUrl)
    window.sessionStorage.setItem(buildLocalViewerStorageKey('agent-token', selectedClientId), agentToken.trim())
  }

  const checkAgent = async () => {
    setCheckingAgent(true)
    setAgentOnline(false)
    try {
      const response = await fetch(`${normalizedAgentUrl}/health`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error('Agente local não respondeu corretamente.')
      setAgentOnline(true)
      setAgentHostname(String(payload.hostname || 'PC local'))
      saveSettings()
      toast('Agente local conectado.', 'success')
    } catch {
      setAgentHostname('')
      toast('Agente indisponível. Confirme se ele está em execução neste computador.', 'error')
    } finally {
      setCheckingAgent(false)
    }
  }

  const saveDiagnostic = async (results: Record<string, PingResult>) => {
    if (!selectedClientId) return
    const { data: authData } = await supabase.auth.getUser()
    const { error } = await supabase.from('network_diagnostics').insert({
      client_id: selectedClientId,
      user_id: authData.user?.id,
      access_mode: accessMode,
      agent_hostname: agentHostname || null,
      total_devices: devices.length,
      online_devices: Object.values(results).filter(result => result.online).length,
      offline_devices: Object.values(results).filter(result => !result.online).length,
      results: devices.map(device => ({ ...device, result: results[device.id] || null })),
    })
    if (error) toast('Teste concluído, mas não foi possível salvar o histórico.', 'error')
    else {
      toast('Diagnóstico concluído e salvo no histórico.', 'success')
      setHistoryRefreshKey(value => value + 1)
    }
  }

  return (
    <div className="space-y-5">
      <ClientFilterBanner />
      <div>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> Diagnóstico de Rede</h1>
            <p className="text-sm text-text-muted mt-1">Ferramenta técnica para testar equipamentos a partir da LAN do cliente ou por WireGuard/VPN.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/downloads/CFTV-PROJ-Agente-Windows.zip" download className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-hover text-white px-3 py-2 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Baixar agente Windows
            </a>
            <a href="/downloads/Manual-Diagnostico-de-Rede-CFTV.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-bg-tertiary hover:bg-border text-text-primary border border-border-light px-3 py-2 text-sm font-medium transition-colors">
              <BookOpen className="w-4 h-4" /> Abrir manual
            </a>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={() => setAccessMode('local')} className={`rounded-lg border p-3 text-left ${accessMode === 'local' ? 'border-primary bg-primary/10' : 'border-border-light'}`}>
            <span className="flex items-center gap-2 font-medium text-text-primary"><Cable className="w-4 h-4" /> Rede local</span>
            <span className="text-xs text-text-muted">O PC do agente está conectado à LAN do cliente.</span>
          </button>
          <button type="button" onClick={() => setAccessMode('wireguard')} className={`rounded-lg border p-3 text-left ${accessMode === 'wireguard' ? 'border-primary bg-primary/10' : 'border-border-light'}`}>
            <span className="flex items-center gap-2 font-medium text-text-primary"><ShieldCheck className="w-4 h-4" /> WireGuard/VPN</span>
            <span className="text-xs text-text-muted">O PC do agente possui uma rota VPN para a rede do cliente.</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Input label="URL do agente local" value={agentUrl} onChange={event => setAgentUrl(event.target.value)} placeholder={DEFAULT_AGENT_URL} />
          <Input label="Token do agente" type="password" value={agentToken} onChange={event => setAgentToken(event.target.value)} placeholder="Token desta sessão" />
          <Button onClick={checkAgent} disabled={checkingAgent || !normalizedAgentUrl} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${checkingAgent ? 'animate-spin' : ''}`} /> Verificar agente
          </Button>
        </div>

        <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${agentOnline ? 'bg-success/10 text-success' : 'bg-bg-primary text-text-muted'}`}>
          <Wifi className="w-4 h-4" />
          {agentOnline ? `Agente on-line em ${agentHostname || 'PC local'} · modo ${accessMode === 'wireguard' ? 'WireGuard/VPN' : 'rede local'}` : 'Agente ainda não verificado. O teste permanece bloqueado para evitar falso diagnóstico.'}
        </div>
      </div>

      <PingStatusCard devices={devices} agentUrl={normalizedAgentUrl} agentToken={agentToken} accessMode={accessMode} agentOnline={agentOnline} onComplete={saveDiagnostic} />
      <NetworkDiagnosticHistory clientId={selectedClientId} refreshKey={historyRefreshKey} />
    </div>
  )
}
