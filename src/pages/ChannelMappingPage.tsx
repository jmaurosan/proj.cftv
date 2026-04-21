import { useState, useEffect, useMemo } from 'react'
import { Monitor, MapPin, Plug, Network, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Camera, Dvr } from '../lib/types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

type CameraWithRelations = Camera & {
  power_baluns?: { name: string } | null
  switches?: { name: string } | null
}

export default function ChannelMappingPage() {
  const [cameras, setCameras] = useState<CameraWithRelations[]>([])
  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDvr, setSelectedDvr] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      // Busca câmeras analógicas com relações
      const { data: camData, error: camError } = await supabase
        .from('cameras')
        .select('*, dvrs(name), power_baluns(name), switches(name)')
        .eq('connection_type', 'analogica')
        .order('dvr_id')
        .order('channel_number', { ascending: true })

      // Busca todos os DVRs para o filtro
      const { data: dvrData } = await supabase
        .from('dvrs')
        .select('*')
        .order('name')

      if (camError) {
        setError(camError.message)
      } else {
        setCameras((camData as CameraWithRelations[]) || [])
      }
      setDvrs((dvrData as Dvr[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  // Agrupa câmeras por DVR
  const grouped = useMemo(() => {
    const filtered =
      selectedDvr === 'all'
        ? cameras
        : cameras.filter((c) => c.dvr_id === selectedDvr)

    const map = new Map<string, CameraWithRelations[]>()
    for (const cam of filtered) {
      const dvrId = cam.dvr_id || 'sem-dvr'
      if (!map.has(dvrId)) map.set(dvrId, [])
      map.get(dvrId)!.push(cam)
    }
    return map
  }, [cameras, selectedDvr])

  // Busca nome do DVR
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Mapeamento de Canais</h2>
          <p className="text-text-muted text-sm mt-1">
            Visualize todas as conexões: câmera → canal → balun → switch
          </p>
        </div>

        {/* Filtro por DVR */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={selectedDvr}
            onChange={(e) => setSelectedDvr(e.target.value)}
            className="px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">Todos os DVRs</option>
            {dvrs.map((dvr) => (
              <option key={dvr.id} value={dvr.id}>
                {dvr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {grouped.size === 0 ? (
        <div className="text-center py-16">
          <EmptyState message="Nenhuma câmera analógica encontrada. Cadastre câmeras conectadas a um DVR para visualizar o mapeamento." />
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dvrId, cams]) => (
            <div
              key={dvrId}
              className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden"
            >
              {/* Header do DVR */}
              <div className="px-4 py-3 bg-bg-tertiary border-b border-border-light flex items-center gap-2">
                <Monitor className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-text-primary">{getDvrName(dvrId)}</h3>
                <span className="text-xs text-text-muted ml-2">
                  {cams.length} câmera(s)
                </span>
              </div>

              {/* Tabela de canais */}
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
                      <tr
                        key={cam.id}
                        className="hover:bg-bg-tertiary/30 transition-colors"
                      >
                        {/* Canal */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent font-bold text-sm">
                            {cam.channel_number ?? '-'}
                          </span>
                        </td>

                        {/* Câmera */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{cam.name}</p>
                          <p className="text-xs text-text-muted sm:hidden flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {cam.location}
                          </p>
                        </td>

                        {/* Localização (desktop) */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="flex items-center gap-1 text-text-secondary">
                            <MapPin className="w-3.5 h-3.5 text-text-muted" />
                            {cam.location}
                          </span>
                        </td>

                        {/* Balun */}
                        <td className="px-4 py-3">
                          {cam.balun_id && cam.power_baluns?.name ? (
                            <span className="flex items-center gap-1.5 text-text-secondary">
                              <Plug className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                {cam.power_baluns.name}
                                {cam.balun_port && (
                                  <span className="text-text-muted ml-1">
                                    (porta {cam.balun_port})
                                  </span>
                                )}
                              </span>
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">-</span>
                          )}
                        </td>

                        {/* Switch */}
                        <td className="px-4 py-3">
                          {cam.switch_id && cam.switches?.name ? (
                            <span className="flex items-center gap-1.5 text-text-secondary">
                              <Network className="w-3.5 h-3.5 text-blue-400" />
                              <span>
                                {cam.switches.name}
                                {cam.switch_port && (
                                  <span className="text-text-muted ml-1">
                                    (porta {cam.switch_port})
                                  </span>
                                )}
                              </span>
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">-</span>
                          )}
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
    </div>
  )
}
