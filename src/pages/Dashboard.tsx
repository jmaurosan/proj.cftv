import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import DonutChart from '../components/ui/DonutChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useClient } from '../contexts/ClientContext'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import PingStatusCard from '../components/ui/PingStatusCard'

interface DashData {
  dvrs: { id: string; name: string; status: string; ip_address: string; total_channels: number }[]
  cameras: { id: string; name: string; status: string; connection_type: string; poe_powered: boolean; type: string; location: string }[]
  switches: { id: string; name: string; status: string; is_poe: boolean; poe_standard: string | null; poe_budget_watts: number | null; total_ports: number; ip_address?: string | null }[]
  baluns: { id: string; status: string; balun_type?: 'passive' | 'power' | null }[]
  routers?: { id: string; name: string; status: string; ip_address: string | null }[]
  dvrChannelIssues: { id: string; dvr_id: string; channel_number: number; notes: string | null; dvrName: string }[]
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

  useEffect(() => {
    async function load() {
      let dvrsQuery = supabase.from('dvrs').select('id, name, status, ip_address, total_channels').order('name')
      let camerasQuery = supabase.from('cameras').select('id, name, status, connection_type, poe_powered, type, location').order('name')
      let switchesQuery = supabase.from('switches').select('id, name, status, is_poe, poe_standard, poe_budget_watts, total_ports, ip_address').order('name')
      let balunsQuery = supabase.from('power_baluns').select('id, status, balun_type')
      let cablesQuery = supabase.from('cable_connections').select('id')
      let routersQuery = supabase.from('routers').select('id, name, status, ip_address').order('name')

      if (selectedClientId) {
        dvrsQuery = dvrsQuery.eq('client_id', selectedClientId)
        camerasQuery = camerasQuery.eq('client_id', selectedClientId)
        switchesQuery = switchesQuery.eq('client_id', selectedClientId)
        balunsQuery = balunsQuery.eq('client_id', selectedClientId)
        cablesQuery = cablesQuery.eq('client_id', selectedClientId)
        routersQuery = routersQuery.eq('client_id', selectedClientId)
      }

      const [dvrs, cameras, switches, baluns, cables, routers] = await Promise.all([
        dvrsQuery,
        camerasQuery,
        switchesQuery,
        balunsQuery,
        cablesQuery,
        routersQuery
      ])

      const dvrIds = (dvrs.data || []).map((d) => d.id)
      const dvrChannelIssues = dvrIds.length > 0
        ? await supabase
            .from('dvr_channels')
            .select('id, dvr_id, channel_number, notes, dvrs(name)')
            .eq('is_active', false)
            .in('dvr_id', dvrIds)
            .order('channel_number')
        : { data: [] }

      setData({
        dvrs: (dvrs.data || []) as DashData['dvrs'],
        cameras: (cameras.data || []) as DashData['cameras'],
        switches: (switches.data || []) as DashData['switches'],
        baluns: (baluns.data || []) as DashData['baluns'],
        routers: (routers.data || []) as DashData['routers'],
        dvrChannelIssues: ((dvrChannelIssues.data || []) as unknown as {
          id: string
          dvr_id: string
          channel_number: number
          notes: string | null
          dvrs?: { name: string } | { name: string }[] | null
        }[]).map((issue) => ({
          id: issue.id,
          dvr_id: issue.dvr_id,
          channel_number: issue.channel_number,
          notes: issue.notes,
          dvrName: Array.isArray(issue.dvrs) ? issue.dvrs[0]?.name || 'DVR' : issue.dvrs?.name || 'DVR',
        })),
        cableCount: cables.data?.length ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [selectedClientId])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  // Derived metrics
  const allDevices = [...data.dvrs, ...data.cameras, ...data.switches, ...data.baluns]
  const totalDevices = allDevices.length
  const activeDevices = allDevices.filter(d => d.status === 'ativo').length
  const integrity = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0

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

  const healthSegments = [
    { value: activeDevices, color: '#22c55e', label: 'Online' },
    { value: allDevices.filter(d => d.status === 'manutencao').length, color: '#f59e0b', label: 'Manutencao' },
    { value: allDevices.filter(d => d.status === 'inativo').length, color: '#ef4444', label: 'Offline' },
  ]

  const recentDevices = [
    ...data.dvrs.map(d => ({ name: d.name, type: 'DVR', status: d.status, detail: d.ip_address })),
    ...data.cameras.slice(0, 4).map(c => ({ name: c.name, type: 'Camera', status: c.status, detail: c.location })),
    ...data.switches.map(s => ({ name: s.name, type: 'Switch', status: s.status, detail: s.is_poe ? 'PoE' : 'Standard' })),
  ].slice(0, 8)

  const integrityColor = integrity >= 80 ? 'text-success' : integrity >= 50 ? 'text-warning' : 'text-danger'
  const integrityGlow = integrity >= 80 ? 'shadow-success/20' : integrity >= 50 ? 'shadow-warning/20' : 'shadow-danger/20'

  const pingDevices = data ? [
    ...data.dvrs.filter(d => d.ip_address).map(d => ({ id: d.id, name: d.name, type: 'DVR' as const, ip: d.ip_address })),
    ...data.switches.filter(s => s.ip_address).map(s => ({ id: s.id, name: s.name, type: 'Switch' as const, ip: s.ip_address! })),
    ...(data.routers || []).filter(r => r.ip_address).map(r => ({ id: r.id, name: r.name, type: 'Roteador' as const, ip: r.ip_address! }))
  ] : []

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Filtro do Cliente */}
      <ClientFilterBanner />

      {/* Diagnóstico de Rede Local */}
      {selectedClientId && pingDevices.length > 0 && (
        <PingStatusCard devices={pingDevices} />
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
                <h3 className="text-sm font-bold text-rose-200">Canais de DVR com atenção</h3>
                <p className="text-xs text-rose-100/80 mt-1">
                  {channelsWithIssues} canal(is) desabilitado(s) por problema de câmera, canal queimado ou manutenção.
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
                  {issue.notes ? ` · ${issue.notes}` : ''}
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
                  <div className="h-full bg-warning" style={{ width: `${(allDevices.filter(d => d.status === 'manutencao').length / totalDevices) * 100}%` }} />
                  <div className="h-full bg-danger rounded-r-full" style={{ width: `${(allDevices.filter(d => d.status === 'inativo').length / totalDevices) * 100}%` }} />
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
