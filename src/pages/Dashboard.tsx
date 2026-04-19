import { useEffect, useState } from 'react'
import {
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

interface DashData {
  dvrs: { id: string; name: string; status: string; ip_address: string; total_channels: number }[]
  cameras: { id: string; name: string; status: string; connection_type: string; poe_powered: boolean; type: string; location: string }[]
  switches: { id: string; name: string; status: string; is_poe: boolean; poe_standard: string | null; poe_budget_watts: number | null; total_ports: number }[]
  baluns: { id: string; status: string }[]
  cableCount: number
}

function countStatus(items: { status: string }[]) {
  return {
    ativo: items.filter(i => i.status === 'ativo').length,
    inativo: items.filter(i => i.status === 'inativo').length,
    manutencao: items.filter(i => i.status === 'manutencao').length,
    total: items.length,
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [dvrs, cameras, switches, baluns, cables] = await Promise.all([
        supabase.from('dvrs').select('id, name, status, ip_address, total_channels').order('name'),
        supabase.from('cameras').select('id, name, status, connection_type, poe_powered, type, location').order('name'),
        supabase.from('switches').select('id, name, status, is_poe, poe_standard, poe_budget_watts, total_ports').order('name'),
        supabase.from('power_baluns').select('id, status'),
        supabase.from('cable_connections').select('id'),
      ])
      setData({
        dvrs: (dvrs.data || []) as DashData['dvrs'],
        cameras: (cameras.data || []) as DashData['cameras'],
        switches: (switches.data || []) as DashData['switches'],
        baluns: (baluns.data || []) as DashData['baluns'],
        cableCount: cables.data?.length ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

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
  const totalChannels = data.dvrs.reduce((sum, d) => sum + d.total_channels, 0)

  const cableCoverage = data.cameras.length > 0 ? Math.round((data.cableCount / data.cameras.length) * 100) : 0

  // Donut data
  const healthSegments = [
    { value: activeDevices, color: '#22c55e', label: 'Online' },
    { value: allDevices.filter(d => d.status === 'manutencao').length, color: '#f59e0b', label: 'Manutencao' },
    { value: allDevices.filter(d => d.status === 'inativo').length, color: '#ef4444', label: 'Offline' },
  ]

  // Recent devices (last 8 by name)
  const recentDevices = [
    ...data.dvrs.map(d => ({ name: d.name, type: 'DVR', status: d.status, detail: d.ip_address })),
    ...data.cameras.slice(0, 4).map(c => ({ name: c.name, type: 'Camera', status: c.status, detail: c.location })),
    ...data.switches.map(s => ({ name: s.name, type: 'Switch', status: s.status, detail: s.is_poe ? 'PoE' : 'Standard' })),
  ].slice(0, 8)

  const integrityColor = integrity >= 80 ? 'text-success' : integrity >= 50 ? 'text-warning' : 'text-danger'
  const integrityGlow = integrity >= 80 ? 'shadow-success/20' : integrity >= 50 ? 'shadow-warning/20' : 'shadow-danger/20'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Dashboard CFTV</h2>
          <p className="text-text-muted text-sm mt-0.5 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Integridade do sistema: <span className={`font-semibold ${integrityColor}`}>{integrity}%</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-secondary border border-border-light">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            SISTEMA ATIVO
          </span>
        </div>
      </div>

      {/* ============ ROW 1: Hero Stats ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cameras */}
        <div className="relative bg-bg-secondary border border-border-light rounded-xl p-5 overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-500/0" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium">Total de Cameras</p>
              <p className="text-4xl font-bold text-text-primary mt-2 font-mono tracking-tight">{camStats.total}</p>
              <p className="text-xs text-text-muted mt-2">
                <span className="text-cyan-400 font-medium">{camStats.ativo}</span> ativas
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-border-light/50">
            <span className="text-[10px] text-text-muted">{camAnalog} Analogicas</span>
            <span className="text-[10px] text-text-muted">|</span>
            <span className="text-[10px] text-cyan-400">{camIP} IP</span>
          </div>
        </div>

        {/* DVRs */}
        <div className="relative bg-bg-secondary border border-border-light rounded-xl p-5 overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500/0" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium">DVRs</p>
              <p className="text-4xl font-bold text-text-primary mt-2 font-mono tracking-tight">{dvrStats.total}</p>
              <p className="text-xs text-text-muted mt-2">
                <span className="text-indigo-400 font-medium">{dvrStats.ativo}</span> ativos
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-border-light/50">
            <span className="text-[10px] text-text-muted">{totalChannels} Canais</span>
          </div>
        </div>

        {/* Switches */}
        <div className="relative bg-bg-secondary border border-border-light rounded-xl p-5 overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-500/0" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium">Switches</p>
              <p className="text-4xl font-bold text-text-primary mt-2 font-mono tracking-tight">{swStats.total}</p>
              <p className="text-xs text-text-muted mt-2">
                <span className="text-emerald-400 font-medium">{swStats.ativo}</span> ativos
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Network className="w-5 h-5" />
            </div>
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-border-light/50">
            <span className="text-[10px] text-emerald-400">{poeSwitches.length} PoE</span>
            <span className="text-[10px] text-text-muted">|</span>
            <span className="text-[10px] text-text-muted">{totalPorts} Portas</span>
          </div>
        </div>

        {/* System Integrity */}
        <div className={`relative bg-bg-secondary border border-border-light rounded-xl p-5 overflow-hidden hover:shadow-lg ${integrityGlow} transition-all`}>
          <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${integrity >= 80 ? 'from-success to-success/0' : integrity >= 50 ? 'from-warning to-warning/0' : 'from-danger to-danger/0'}`} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium">Integridade</p>
              <p className={`text-4xl font-bold mt-2 font-mono tracking-tight ${integrityColor}`}>
                {integrity}<span className="text-lg ml-0.5">%</span>
              </p>
              <p className="text-xs text-text-muted mt-2">
                <span className={`font-medium ${integrityColor}`}>{activeDevices}</span> / {totalDevices} dispositivos
              </p>
            </div>
            <div className={`p-2.5 rounded-lg ${integrity >= 80 ? 'bg-success/10 text-success' : integrity >= 50 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
              <Shield className="w-5 h-5" />
            </div>
          </div>
          {/* Mini status bar */}
          <div className="mt-3 pt-3 border-t border-border-light/50">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device Health - Donut */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
          <h3 className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-5">Saude dos Dispositivos</h3>
          <div className="flex items-center gap-8">
            <DonutChart segments={healthSegments} size={150} thickness={18} />
            <div className="flex-1 space-y-3">
              {healthSegments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color, boxShadow: `0 0 6px ${seg.color}60` }} />
                    <span className="text-sm text-text-secondary">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary font-mono">{seg.value}</span>
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
        <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
          <h3 className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-5">Infraestrutura</h3>
          <div className="space-y-4">
            {[
              { label: 'Cameras', total: camStats.total, active: camStats.ativo, color: 'bg-cyan-500', icon: Camera },
              { label: 'DVRs', total: dvrStats.total, active: dvrStats.ativo, color: 'bg-indigo-500', icon: Server },
              { label: 'Switches', total: swStats.total, active: swStats.ativo, color: 'bg-emerald-500', icon: Network },
              { label: 'Power Baluns', total: data.baluns.length, active: data.baluns.filter(b => b.status === 'ativo').length, color: 'bg-purple-500', icon: Cable },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-sm text-text-secondary">{item.label}</span>
                  </div>
                  <span className="text-sm font-mono text-text-primary">
                    <span className="font-bold">{item.active}</span>
                    <span className="text-text-muted"> / {item.total}</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-bg-tertiary/50 overflow-hidden">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Inventory */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
          <h3 className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-4">Inventario Rapido</h3>
          {recentDevices.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Nenhum dispositivo cadastrado</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[auto_1fr_80px_60px] gap-3 px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider">
                <span />
                <span>Dispositivo</span>
                <span>Tipo</span>
                <span className="text-right">Status</span>
              </div>
              {recentDevices.map((device, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_80px_60px] gap-3 items-center px-3 py-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors"
                >
                  <CircleDot
                    className={`w-3 h-3 ${
                      device.status === 'ativo' ? 'text-success' : device.status === 'manutencao' ? 'text-warning' : 'text-danger'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{device.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{device.detail}</p>
                  </div>
                  <span className="text-xs text-text-muted">{device.type}</span>
                  <span className={`text-[10px] text-right font-medium uppercase ${
                    device.status === 'ativo' ? 'text-success' : device.status === 'manutencao' ? 'text-warning' : 'text-danger'
                  }`}>
                    {device.status === 'ativo' ? 'Online' : device.status === 'manutencao' ? 'Manut.' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Metrics */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
          <h3 className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-4">Metricas de Conexao</h3>
          <div className="space-y-4">
            {/* Metric items */}
            {[
              { icon: MonitorCheck, label: 'Cameras Analogicas', value: String(camAnalog), color: 'text-slate-400' },
              { icon: Wifi, label: 'Cameras IP', value: String(camIP), color: 'text-cyan-400' },
              { icon: Zap, label: 'Cameras PoE', value: String(camPoe), color: 'text-amber-400' },
              { icon: Network, label: 'Switches PoE', value: `${poeSwitches.length} (${totalPoeBudget}W)`, color: 'text-emerald-400' },
              { icon: Cable, label: 'Documentacao Cabeamento', value: `${cableCoverage}%`, color: 'text-purple-400' },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center justify-between py-2 border-b border-border-light/30 last:border-0">
                <div className="flex items-center gap-3">
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-sm text-text-secondary">{metric.label}</span>
                </div>
                <span className={`text-sm font-bold font-mono ${metric.color}`}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
