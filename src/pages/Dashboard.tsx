import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Camera,
  Server,
  Network,
  Cable,
  Shield,
  Wifi,
  Zap,
  MonitorCheck,
  Activity,
  CircleDot,
  BatteryCharging,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import DonutChart from '../components/ui/DonutChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useClient } from '../contexts/ClientContext'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import PingStatusCard, { type PingResult } from '../components/ui/PingStatusCard'
import { parseProjectAssets, type Nobreak } from '../lib/projectAssets'

interface DashData {
  dvrs: { id: string; name: string; status: string; ip_address: string; total_channels: number }[]
  cameras: {
    id: string
    name: string
    status: string
    connection_type: string
    poe_powered: boolean
    type: string
    location: string
    ip_address: string | null
    dvr_id: string | null
    channel_number: number | null
    dvrs?: { name: string } | { name: string }[] | null
  }[]
  switches: { id: string; name: string; status: string; is_poe: boolean; poe_standard: string | null; poe_budget_watts: number | null; total_ports: number; ip_address?: string | null }[]
  baluns: { id: string; status: string; balun_type?: 'passive' | 'power' | null }[]
  routers?: { id: string; name: string; status: string; ip_address: string | null }[]
  nobreaks: Nobreak[]
  dvrChannelIssues: { id: string; dvr_id: string; channel_number: number; cameraName: string; status: string; dvrName: string }[]
  cableCount: number
}

const countStatus = (items: { status: string }[]) => ({
  ativo: items.filter(i => i.status === 'ativo').length,
  inativo: items.filter(i => i.status === 'inativo').length,
  manutencao: items.filter(i => i.status === 'manutencao').length,
  total: items.length,
})

export default function Dashboard() {
  const { selectedClientId } = useClient()
  const navigate = useNavigate()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (!selectedClientId) {
        setData({
          dvrs: [],
          cameras: [],
          switches: [],
          baluns: [],
          routers: [],
          nobreaks: [],
          dvrChannelIssues: [],
          cableCount: 0,
        })
        setLoading(false)
        return
      }

      const dvrsQuery = supabase.from('dvrs').select('id, name, status, ip_address, total_channels').eq('client_id', selectedClientId).order('name')
      const camerasQuery = supabase.from('cameras').select('id, name, status, connection_type, poe_powered, type, location, ip_address, dvr_id, channel_number, dvrs(name)').eq('client_id', selectedClientId).order('name')
      const switchesQuery = supabase.from('switches').select('id, name, status, is_poe, poe_standard, poe_budget_watts, total_ports, ip_address').eq('client_id', selectedClientId).order('name')
      const balunsQuery = supabase.from('power_baluns').select('id, status, balun_type').eq('client_id', selectedClientId)
      const cablesQuery = supabase.from('cable_connections').select('id').eq('client_id', selectedClientId)
      const routersQuery = supabase.from('routers').select('id, name, status, ip_address').eq('client_id', selectedClientId).order('name')
      const clientQuery = supabase.from('clients').select('notes').eq('id', selectedClientId).single()

      const [dvrs, cameras, switches, baluns, cables, routers, client] = await Promise.all([
        dvrsQuery,
        camerasQuery,
        switchesQuery,
        balunsQuery,
        cablesQuery,
        routersQuery,
        clientQuery,
      ])

      const cameraRows = (cameras.data || []) as unknown as DashData['cameras']
      const dvrChannelIssues = cameraRows
        .filter((camera) => camera.status !== 'ativo' && camera.dvr_id && camera.channel_number != null)
        .map((camera) => ({
          id: camera.id,
          dvr_id: camera.dvr_id!,
          channel_number: camera.channel_number!,
          cameraName: camera.name,
          status: camera.status,
          dvrName: Array.isArray(camera.dvrs) ? camera.dvrs[0]?.name || 'DVR' : camera.dvrs?.name || 'DVR',
        }))
        .sort((a, b) => a.dvrName.localeCompare(b.dvrName) || a.channel_number - b.channel_number)

      setData({
        dvrs: (dvrs.data || []) as DashData['dvrs'],
        cameras: cameraRows,
        switches: (switches.data || []) as DashData['switches'],
        baluns: (baluns.data || []) as DashData['baluns'],
        routers: (routers.data || []) as DashData['routers'],
        nobreaks: parseProjectAssets(client.data?.notes).nobreaks,
        dvrChannelIssues,
        cableCount: cables.data?.length ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [selectedClientId])

  const pingDevices = useMemo(() => data ? [
    ...data.dvrs.filter(d => d.ip_address).map(d => ({ id: d.id, name: d.name, type: 'DVR' as const, ip: d.ip_address })),
    ...data.cameras
      .filter(c => c.ip_address && (c.connection_type === 'ip' || c.connection_type === 'wifi'))
      .map(c => ({ id: c.id, name: c.name, type: 'Câmera' as const, ip: c.ip_address! })),
    ...data.switches.filter(s => s.ip_address).map(s => ({ id: s.id, name: s.name, type: 'Switch' as const, ip: s.ip_address! })),
    ...(data.routers || []).filter(r => r.ip_address).map(r => ({ id: r.id, name: r.name, type: 'Roteador' as const, ip: r.ip_address! }))
  ] : [], [data])

  const handlePingResultsChange = useCallback((nextResults: Record<string, PingResult>) => {
    setPingResults(nextResults)
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  // Derived metrics

  const isOnlineByStatus = (device: { id: string; status: string }) => {
    const live = pingResults[device.id]
    if (live?.tested && live.status !== 'unverified') return live.online
    return device.status === 'ativo'
  }

  const allDevices = [...data.dvrs, ...data.cameras, ...data.switches, ...data.baluns, ...(data.routers || []), ...data.nobreaks]
  const totalDevices = allDevices.length
  const activeDevices = allDevices.filter(isOnlineByStatus).length
  const integrity = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0
  const maintenanceDevices = allDevices.filter(d => (!pingResults[d.id]?.tested || pingResults[d.id]?.status === 'unverified') && d.status === 'manutencao').length
  const offlineDevices = allDevices.filter(d => {
    const live = pingResults[d.id]
    if (live?.tested && live.status !== 'unverified') return !live.online
    return d.status === 'inativo'
  }).length

  const camStats = countStatus(data.cameras)
  const camAnalog = data.cameras.filter(c => c.connection_type === 'analogica').length
  const camIP = data.cameras.filter(c => c.connection_type === 'ip').length
  const camPoe = data.cameras.filter(c => c.poe_powered).length

  const swStats = countStatus(data.switches)
  const poeSwitches = data.switches.filter(s => s.is_poe)
  const totalPoeBudget = poeSwitches.reduce((sum, s) => sum + (s.poe_budget_watts || 0), 0)
  const totalPorts = data.switches.reduce((sum, s) => sum + s.total_ports, 0)

  const dvrStats = countStatus(data.dvrs)
  const passiveBaluns = data.baluns.filter(b => b.balun_type === 'passive').length
  const powerBaluns = data.baluns.length - passiveBaluns
  const totalChannels = data.dvrs.reduce((sum, d) => sum + d.total_channels, 0)
  const channelsWithIssues = data.dvrChannelIssues.length
  const operationalChannels = Math.max(0, totalChannels - channelsWithIssues)
  const cableCoverage = data.cameras.length > 0 ? Math.round((data.cableCount / data.cameras.length) * 100) : 0
  const nobreakWarnings = data.nobreaks.filter((item) => !item.hasProtection || item.batteryQuantity < 1 || item.batteryCapacityAh <= 0)

  const healthSegments = [
    { value: activeDevices, color: '#22c55e', label: 'Ativo no cadastro' },
    { value: maintenanceDevices, color: '#f59e0b', label: 'Manutencao' },
    { value: offlineDevices, color: '#ef4444', label: 'Offline' },
  ]

  const getDeviceStatus = (device: { id: string; status: string }) => {
    const live = pingResults[device.id]
    if (live?.tested && live.status !== 'unverified') return live.online ? 'ativo' : 'inativo'
    return device.status
  }

  const recentDevices = [
    ...data.dvrs.map(d => ({ name: d.name, type: 'DVR', status: getDeviceStatus(d), detail: d.ip_address })),
    ...data.cameras.slice(0, 4).map(c => ({ name: c.name, type: 'Camera', status: getDeviceStatus(c), detail: c.location })),
    ...data.switches.map(s => ({ name: s.name, type: 'Switch', status: getDeviceStatus(s), detail: s.is_poe ? 'PoE' : 'Standard' })),
  ].slice(0, 8)

  const integrityColor = integrity >= 80 ? 'text-success' : integrity >= 50 ? 'text-warning' : 'text-danger'
  const integrityGlow = integrity >= 80 ? 'shadow-success/20' : integrity >= 50 ? 'shadow-warning/20' : 'shadow-danger/20'

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Filtro do Cliente */}
      <ClientFilterBanner />

      {/* Diagnóstico de Rede Local */}
      {selectedClientId && pingDevices.length > 0 && (
        <PingStatusCard devices={pingDevices} onResultsChange={handlePingResultsChange} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">Dashboard CFTV</h2>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5 flex items-center gap-2">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Integridade: <span className={`font-semibold ${integrityColor}`}>{integrity}%</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-secondary border border-border-light">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="hidden sm:inline">SISTEMA ATIVO</span>
            <span className="sm:hidden">ATIVO</span>
          </span>
        </div>
      </div>

      {channelsWithIssues > 0 && (
        <div
          onClick={() => navigate('/dvrs')}
          className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-4 cursor-pointer hover:bg-rose-500/15 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-200">Câmeras de DVR com atenção</h3>
                <p className="text-xs text-rose-100/80 mt-1">
                  {channelsWithIssues} câmera(s) inativa(s) ou em manutenção nos canais dos DVRs.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.dvrChannelIssues.slice(0, 4).map((issue) => (
                <span
                  key={issue.id}
                  className="px-2 py-1 rounded-md bg-bg-primary/70 border border-rose-500/30 text-[10px] font-mono text-rose-100"
                >
                  {issue.dvrName} CH{issue.channel_number}
                  {` · ${issue.cameraName}`}
                </span>
              ))}
              {channelsWithIssues > 4 && (
                <span className="px-2 py-1 rounded-md bg-bg-primary/70 border border-rose-500/30 text-[10px] font-mono text-rose-100">
                  +{channelsWithIssues - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {data.nobreaks.length > 0 && (
        <div onClick={() => navigate('/energia-documentos')} className={`rounded-xl border p-4 cursor-pointer transition-colors ${nobreakWarnings.length > 0 ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15' : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><div className={`rounded-lg p-2 ${nobreakWarnings.length > 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}><BatteryCharging className="h-5 w-5" /></div><div><h3 className="text-sm font-bold text-text-primary">Proteção elétrica do sistema</h3><p className="mt-1 text-xs text-text-secondary">{data.nobreaks.length} nobreak(s), {data.nobreaks.reduce((sum, item) => sum + item.batteryQuantity, 0)} bateria(s) cadastrada(s).</p></div></div>
            <span className={`rounded px-2 py-1 text-xs font-semibold ${nobreakWarnings.length > 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{nobreakWarnings.length > 0 ? `${nobreakWarnings.length} atenção` : 'Protegido'}</span>
          </div>
        </div>
      )}

      {/* ============ ROW 1: Hero Stats ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cameras */}
        <div
          onClick={() => navigate('/cameras')}
          className="relative bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 overflow-hidden group hover:border-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium truncate">Cameras</p>
              <p className="text-2xl sm:text-4xl font-bold text-text-primary mt-1 sm:mt-2 font-mono tracking-tight">{camStats.total}</p>
              <p className="text-xs text-text-muted mt-1 sm:mt-2">
                <span className="text-cyan-400 font-medium">{camStats.ativo}</span> ativas
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-light/50 text-[10px]">
            <span className="text-text-muted">{camAnalog} Analog</span>
            <span className="text-text-muted">|</span>
            <span className="text-cyan-400">{camIP} IP</span>
          </div>
        </div>

        {/* DVRs */}
        <div
          onClick={() => navigate('/dvrs')}
          className="relative bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 overflow-hidden group hover:border-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium truncate">DVRs</p>
              <p className="text-2xl sm:text-4xl font-bold text-text-primary mt-1 sm:mt-2 font-mono tracking-tight">{dvrStats.total}</p>
              <p className="text-xs text-text-muted mt-1 sm:mt-2">
                <span className="text-indigo-400 font-medium">{dvrStats.ativo}</span> ativos
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <Server className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-light/50 text-[10px] text-text-muted">
            <span>{operationalChannels}/{totalChannels} canais OK</span>
            {channelsWithIssues > 0 && (
              <>
                <span>|</span>
                <span className="text-rose-400">{channelsWithIssues} atenção</span>
              </>
            )}
          </div>
        </div>

        {/* Switches */}
        <div
          onClick={() => navigate('/switches')}
          className="relative bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 overflow-hidden group hover:border-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium truncate">Switches</p>
              <p className="text-2xl sm:text-4xl font-bold text-text-primary mt-1 sm:mt-2 font-mono tracking-tight">{swStats.total}</p>
              <p className="text-xs text-text-muted mt-1 sm:mt-2">
                <span className="text-emerald-400 font-medium">{swStats.ativo}</span> ativos
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Network className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-light/50 text-[10px]">
            <span className="text-emerald-400">{poeSwitches.length} PoE</span>
            <span className="text-text-muted">|</span>
            <span className="text-text-muted">{totalPorts} Portas</span>
          </div>
        </div>

        {/* System Integrity */}
        <div className={`relative bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-lg ${integrityGlow} transition-all`}>
          <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${integrity >= 80 ? 'from-success to-success/0' : integrity >= 50 ? 'from-warning to-warning/0' : 'from-danger to-danger/0'}`} />
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium truncate">Integridade</p>
              <p className={`text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 font-mono tracking-tight ${integrityColor}`}>
                {integrity}<span className="text-base sm:text-lg ml-0.5">%</span>
              </p>
              <p className="text-xs text-text-muted mt-1 sm:mt-2">
                <span className={`font-medium ${integrityColor}`}>{activeDevices}</span> / {totalDevices} disp.
              </p>
            </div>
            <div className={`p-2 sm:p-2.5 rounded-lg ${integrity >= 80 ? 'bg-success/10 text-success' : integrity >= 50 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'} shrink-0`}>
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-light/50">
            <div className="w-full h-1.5 rounded-full bg-bg-tertiary/50 overflow-hidden flex">
              {totalDevices > 0 && (
                <>
                  <div className="h-full bg-success rounded-l-full" style={{ width: `${(activeDevices / totalDevices) * 100}%` }} />
                  <div className="h-full bg-warning" style={{ width: `${(maintenanceDevices / totalDevices) * 100}%` }} />
                  <div className="h-full bg-danger rounded-r-full" style={{ width: `${(offlineDevices / totalDevices) * 100}%` }} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 2: Device Health + Infrastructure ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Device Health - Donut */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5">
          <h3 className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium mb-3 sm:mb-5">Saude dos Dispositivos</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <DonutChart segments={healthSegments} size={120} thickness={16} />
            <div className="flex-1 w-full space-y-2 sm:space-y-3">
              {healthSegments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color, boxShadow: `0 0 6px ${seg.color}60` }} />
                    <span className="text-xs sm:text-sm text-text-secondary">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-text-primary font-mono">{seg.value}</span>
                    <span className="text-[10px] text-text-muted">
                      {totalDevices > 0 ? `${Math.round((seg.value / totalDevices) * 100)}%` : '0%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Infrastructure Breakdown */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5">
          <h3 className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium mb-3 sm:mb-5">Infraestrutura</h3>
          <div className="space-y-3 sm:space-y-4">
            {[
              { label: 'Cameras', total: camStats.total, active: camStats.ativo, color: 'bg-cyan-500', icon: Camera, path: '/cameras' },
              { label: 'DVRs', total: dvrStats.total, active: dvrStats.ativo, color: 'bg-indigo-500', icon: Server, path: '/dvrs' },
              { label: 'Switches', total: swStats.total, active: swStats.ativo, color: 'bg-emerald-500', icon: Network, path: '/switches' },
              { label: 'Baluns', total: data.baluns.length, active: data.baluns.filter(b => b.status === 'ativo').length, color: 'bg-purple-500', icon: Cable, path: '/baluns', detail: `${powerBaluns} power · ${passiveBaluns} passivos` },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className={`group/infra select-none ${item.path ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted shrink-0 group-hover/infra:text-text-primary transition-colors" />
                    <span className="text-xs sm:text-sm text-text-secondary group-hover/infra:text-text-primary transition-colors">{item.label}</span>
                    {'detail' in item && item.detail && (
                      <span className="hidden sm:inline text-[10px] text-text-muted">{item.detail}</span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-text-primary">
                    <span className="font-bold">{item.active}</span>
                    <span className="text-text-muted"> / {item.total}</span>
                  </span>
                </div>
                <div className="w-full h-1.5 sm:h-2 rounded-full bg-bg-tertiary/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: item.total > 0 ? `${(item.active / item.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ ROW 3: Inventory + Connection Metrics ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Quick Inventory */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 overflow-hidden">
          <h3 className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium mb-3 sm:mb-4">Inventario Rapido</h3>
          {recentDevices.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Nenhum dispositivo cadastrado</p>
          ) : (
            <div className="space-y-1 min-w-0">
              <div className="hidden sm:grid grid-cols-[auto_1fr_80px_60px] gap-3 px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider">
                <span />
                <span>Dispositivo</span>
                <span>Tipo</span>
                <span className="text-right">Status</span>
              </div>
              {recentDevices.map((device, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (device.type === 'Camera') navigate('/cameras')
                    else if (device.type === 'DVR') navigate('/dvrs')
                    else if (device.type === 'Switch') navigate('/switches')
                  }}
                  className="flex sm:grid sm:grid-cols-[auto_1fr_80px_60px] gap-2 sm:gap-3 items-center px-2 sm:px-3 py-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
                >
                  <CircleDot
                    className={`w-3 h-3 shrink-0 ${
                      device.status === 'ativo' ? 'text-success' : device.status === 'manutencao' ? 'text-warning' : 'text-danger'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-text-primary truncate">{device.name}</p>
                    <p className="text-[10px] text-text-muted truncate hidden sm:block">{device.detail}</p>
                  </div>
                  <span className="text-xs text-text-muted hidden sm:block">{device.type}</span>
                  <span className={`text-[10px] sm:text-[10px] text-right font-medium uppercase shrink-0 ${
                    device.status === 'ativo' ? 'text-success' : device.status === 'manutencao' ? 'text-warning' : 'text-danger'
                  }`}>
                    {device.status === 'ativo' ? 'On' : device.status === 'manutencao' ? 'Manut.' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Metrics */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5">
          <h3 className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider sm:tracking-widest font-medium mb-3 sm:mb-4">Metricas de Conexao</h3>
          <div className="space-y-3 sm:space-y-4">
            {[
              { icon: MonitorCheck, label: 'Cameras Analogicas', value: String(camAnalog), color: 'text-slate-400', path: '/cameras' },
              { icon: Wifi, label: 'Cameras IP', value: String(camIP), color: 'text-cyan-400', path: '/cameras' },
              { icon: Zap, label: 'Cameras PoE', value: String(camPoe), color: 'text-amber-400', path: '/cameras' },
              { icon: Network, label: 'Switches PoE', value: `${poeSwitches.length} (${totalPoeBudget}W)`, color: 'text-emerald-400', path: '/switches' },
              { icon: Cable, label: 'Doc. Cabeamento', value: `${cableCoverage}%`, color: 'text-purple-400', path: '/mapeamento' },
            ].map((metric) => (
              <div
                key={metric.label}
                onClick={() => metric.path && navigate(metric.path)}
                className="flex items-center justify-between py-1.5 sm:py-2 border-b border-border-light/30 last:border-0 cursor-pointer hover:bg-bg-tertiary/10 px-1 rounded transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <metric.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${metric.color} shrink-0`} />
                  <span className="text-xs sm:text-sm text-text-secondary truncate">{metric.label}</span>
                </div>
                <span className={`text-xs sm:text-sm font-bold font-mono ${metric.color} shrink-0 ml-2`}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
