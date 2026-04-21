import { useState, useEffect, useMemo } from 'react'
import { Monitor, MapPin, Plug, Network, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Camera, Dvr, PowerBalun, Switch as SwitchType, BalunPort, SwitchPort } from '../lib/types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

type CameraWithRelations = Camera & {
  power_baluns?: { name: string } | null
  switches?: { name: string } | null
}

type BalunWithPorts = PowerBalun & {
  balun_ports?: (BalunPort & {
    cameras?: { name: string; dvr_id: string | null; channel_number: number | null; dvrs?: { name: string } | null }
  })[]
}

type SwitchWithPorts = SwitchType & {
  switch_ports?: SwitchPort[]
}

export default function ChannelMappingPage() {
  const [cameras, setCameras] = useState<CameraWithRelations[]>([])
  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [baluns, setBaluns] = useState<BalunWithPorts[]>([])
  const [switches, setSwitches] = useState<SwitchWithPorts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDvr, setSelectedDvr] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'dvr' | 'balun' | 'switch'>('dvr')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const [{ data: camData, error: camError }, { data: dvrData }, { data: balunData }, { data: switchData }] = await Promise.all([
        supabase.from('cameras').select('*, dvrs(name), power_baluns(name), switches(name)').eq('connection_type', 'analogica').order('dvr_id').order('channel_number', { ascending: true }),
        supabase.from('dvrs').select('*').order('name'),
        supabase.from('power_baluns').select('*, balun_ports(*, cameras(name, dvr_id, channel_number, dvrs(name)))').order('name'),
        supabase.from('switches').select('*, switch_ports(*)').order('name'),
      ])

      if (camError) setError(camError.message)
      setCameras((camData as CameraWithRelations[]) || [])
      setDvrs((dvrData as Dvr[]) || [])
      setBaluns((balunData as BalunWithPorts[]) || [])
      setSwitches((switchData as SwitchWithPorts[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const groupedByDvr = useMemo(() => {
    const filtered = selectedDvr === 'all' ? cameras : cameras.filter((c) => c.dvr_id === selectedDvr)
    const map = new Map<string, CameraWithRelations[]>()
    for (const cam of filtered) {
      const dvrId = cam.dvr_id || 'sem-dvr'
      if (!map.has(dvrId)) map.set(dvrId, [])
      map.get(dvrId)!.push(cam)
    }
    return map
  }, [cameras, selectedDvr])

  const getDvrName = (dvrId: string | null) => {
    if (!dvrId || dvrId === 'sem-dvr') return 'Sem DVR'
    return dvrs.find((d) => d.id === dvrId)?.name || 'DVR Desconhecido'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Mapeamento de Canais</h2>
          <p className="text-text-muted text-sm mt-1">
            Visualize todas as conexões: câmera → canal → balun → switch
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-light">
        {[
          { key: 'dvr' as const, label: 'Por DVR', icon: Monitor },
          { key: 'balun' as const, label: 'Por Power Balun', icon: Plug },
          { key: 'switch' as const, label: 'Por Switch', icon: Network },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Tab: Por DVR */}
      {activeTab === 'dvr' && (
        <>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={selectedDvr}
              onChange={(e) => setSelectedDvr(e.target.value)}
              className="px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="all">Todos os DVRs</option>
              {dvrs.map((dvr) => (
                <option key={dvr.id} value={dvr.id}>{dvr.name}</option>
              ))}
            </select>
          </div>

          {groupedByDvr.size === 0 ? (
            <div className="text-center py-16">
              <EmptyState message="Nenhuma câmera analógica encontrada." />
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedByDvr.entries()).map(([dvrId, cams]) => (
                <div key={dvrId} className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-bg-tertiary border-b border-border-light flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-text-primary">{getDvrName(dvrId)}</h3>
                    <span className="text-xs text-text-muted ml-2">{cams.length} câmera(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light text-text-muted text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left font-medium">Canal</th>
                          <th className="px-4 py-3 text-left font-medium">Câmera</th>
                          <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Localização</th>
                          <th className="px-4 py-3 text-left font-medium">Balun</th>
                          <th className="px-4 py-3 text-left font-medium">Switch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light">
                        {cams.map((cam) => (
                          <tr key={cam.id} className="hover:bg-bg-tertiary/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent font-bold text-sm">
                                {cam.channel_number ?? '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-text-primary">{cam.name}</p>
                              <p className="text-xs text-text-muted sm:hidden flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> {cam.location}
                              </p>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="flex items-center gap-1 text-text-secondary">
                                <MapPin className="w-3.5 h-3.5 text-text-muted" /> {cam.location}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {cam.balun_id && cam.power_baluns?.name ? (
                                <span className="flex items-center gap-1.5 text-text-secondary">
                                  <Plug className="w-3.5 h-3.5 text-amber-400" />
                                  {cam.power_baluns.name}
                                  {cam.balun_port && <span className="text-text-muted ml-1">(P{cam.balun_port})</span>}
                                </span>
                              ) : <span className="text-text-muted text-xs">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              {cam.switch_id && cam.switches?.name ? (
                                <span className="flex items-center gap-1.5 text-text-secondary">
                                  <Network className="w-3.5 h-3.5 text-blue-400" />
                                  {cam.switches.name}
                                  {cam.switch_port && <span className="text-text-muted ml-1">(P{cam.switch_port})</span>}
                                </span>
                              ) : <span className="text-text-muted text-xs">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Por Power Balun */}
      {activeTab === 'balun' && (
        <div className="space-y-6">
          {baluns.length === 0 ? (
            <EmptyState message="Nenhum Power Balun cadastrado." />
          ) : (
            baluns.map((balun) => (
              <div key={balun.id} className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-bg-tertiary border-b border-border-light flex items-center gap-2">
                  <Plug className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-text-primary">{balun.name}</h3>
                  <span className="text-xs text-text-muted ml-2">{balun.location}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light text-text-muted text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-medium">Porta</th>
                        <th className="px-4 py-3 text-left font-medium">Câmera</th>
                        <th className="px-4 py-3 text-left font-medium">DVR</th>
                        <th className="px-4 py-3 text-left font-medium">Canal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {Array.from({ length: balun.total_ports }, (_, i) => i + 1).map((portNum) => {
                        const port = balun.balun_ports?.find((p) => p.port_number === portNum)
                        return (
                          <tr key={portNum} className="hover:bg-bg-tertiary/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 font-bold text-sm">
                                {portNum}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {port?.cameras?.name ? (
                                <span className="text-text-primary">{port.cameras.name}</span>
                              ) : (
                                <span className="text-text-muted text-xs">Desconectado</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {port?.cameras?.dvrs?.name ? (
                                <span className="text-text-secondary">{port.cameras.dvrs.name}</span>
                              ) : (
                                <span className="text-text-muted text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {port?.cameras?.channel_number ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-accent/10 text-accent font-bold text-xs">
                                  {port.cameras.channel_number}
                                </span>
                              ) : (
                                <span className="text-text-muted text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Por Switch */}
      {activeTab === 'switch' && (
        <div className="space-y-6">
          {switches.length === 0 ? (
            <EmptyState message="Nenhum Switch cadastrado." />
          ) : (
            switches.map((sw) => (
              <div key={sw.id} className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-bg-tertiary border-b border-border-light flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-text-primary">{sw.name}</h3>
                  <span className="text-xs text-text-muted ml-2">{sw.location} — {sw.ip_address}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light text-text-muted text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-medium">Porta</th>
                        <th className="px-4 py-3 text-left font-medium">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium">Dispositivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {Array.from({ length: sw.total_ports }, (_, i) => i + 1).map((portNum) => {
                        const port = sw.switch_ports?.find((p) => p.port_number === portNum)
                        return (
                          <tr key={portNum} className="hover:bg-bg-tertiary/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-400/10 text-blue-400 font-bold text-sm">
                                {portNum}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {port?.device_type ? (
                                <span className="text-text-secondary capitalize">{port.device_type}</span>
                              ) : (
                                <span className="text-text-muted text-xs">Desconectado</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {port?.device_name ? (
                                <span className="text-text-primary">{port.device_name}</span>
                              ) : (
                                <span className="text-text-muted text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
