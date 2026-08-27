import { useState, useEffect, useMemo, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, Monitor, MapPin, Plug, Network, Filter, Pencil, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Camera, Dvr } from '../lib/types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import { useClient } from '../contexts/ClientContext'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import Modal from '../components/ui/Modal'
import CameraForm from '../components/forms/CameraForm'
import { useCameras } from '../hooks/useCameras'
import { useToast } from '../components/ui/Toast'
import { getCameraChannelDiagnostics } from '../lib/dvrChannels'

type CameraWithRelations = Camera & {
  power_baluns?: { name: string } | null
  switches?: { name: string } | null
}

interface ConnectionIntegrityIssue {
  issue_type: string
  camera_id: string
  camera_name: string
  details: string
}

export default function ChannelMappingPage() {
  const { selectedClientId } = useClient()
  const [cameras, setCameras] = useState<CameraWithRelations[]>([])
  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDvr, setSelectedDvr] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [issuesOnly, setIssuesOnly] = useState(false)
  const [editing, setEditing] = useState<CameraWithRelations | null>(null)
  const [connectionIssues, setConnectionIssues] = useState<ConnectionIntegrityIssue[]>([])
  const { update } = useCameras()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
      setLoading(true)
      setError(null)

      if (!selectedClientId) {
        setCameras([])
        setDvrs([])
        setConnectionIssues([])
        setLoading(false)
        return
      }

      // Busca todas as câmeras com os vínculos físicos e de rede.
      const [cameraResult, dvrResult, integrityResult] = await Promise.all([
        supabase
          .from('cameras')
          .select('*, dvrs(name), power_baluns(name), switches(name)')
          .eq('client_id', selectedClientId)
          .order('dvr_id')
          .order('channel_number', { ascending: true }),
        supabase
          .from('dvrs')
          .select('*')
          .eq('client_id', selectedClientId)
          .order('name'),
        supabase.rpc('diagnose_camera_connection_integrity', { p_client_id: selectedClientId }),
      ])
      const { data: camData, error: camError } = cameraResult
      const { data: dvrData } = dvrResult

      if (camError) {
        setError(camError.message)
      } else {
        setCameras((camData as CameraWithRelations[]) || [])
      }
      setDvrs((dvrData as Dvr[]) || [])
      setConnectionIssues((integrityResult.data as ConnectionIntegrityIssue[]) || [])
      setLoading(false)
  }, [selectedClientId])

  useEffect(() => {
    setSelectedDvr('all')
    fetchData()
  }, [fetchData])

  // Busca nome do DVR
  const getDvrName = useCallback((dvrId: string | null) => {
    if (!dvrId || dvrId === 'sem-dvr') return 'Sem DVR'
    return dvrs.find((d) => d.id === dvrId)?.name || 'DVR Desconhecido'
  }, [dvrs])

  const diagnostics = useMemo(() => {
    const dvrById = new Map(dvrs.map((dvr) => [dvr.id, dvr]))
    return new Map(cameras.map((camera) => [
      camera.id,
      getCameraChannelDiagnostics(camera, camera.dvr_id ? dvrById.get(camera.dvr_id) : undefined),
    ]))
  }, [cameras, dvrs])
  const connectionIssuesByCamera = useMemo(() => {
    const groupedIssues = new Map<string, ConnectionIntegrityIssue[]>()
    connectionIssues.forEach((issue) => {
      groupedIssues.set(issue.camera_id, [...(groupedIssues.get(issue.camera_id) ?? []), issue])
    })
    return groupedIssues
  }, [connectionIssues])
  const issueCount = useMemo(
    () => cameras.filter((camera) => (diagnostics.get(camera.id)?.length ?? 0) > 0 || (connectionIssuesByCamera.get(camera.id)?.length ?? 0) > 0).length,
    [cameras, diagnostics, connectionIssuesByCamera],
  )

  // Agrupa câmeras por DVR
  const grouped = useMemo(() => {
    const byDvr =
      selectedDvr === 'all'
        ? cameras
        : selectedDvr === 'sem-dvr'
          ? cameras.filter((c) => !c.dvr_id)
          : cameras.filter((c) => c.dvr_id === selectedDvr)
    const filtered = issuesOnly ? byDvr.filter((camera) => (
      (diagnostics.get(camera.id)?.length ?? 0) > 0 || (connectionIssuesByCamera.get(camera.id)?.length ?? 0) > 0
    )) : byDvr

    const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR')
    const searched = normalizedSearch
      ? filtered.filter((camera) => [
          camera.name,
          camera.location,
          camera.brand,
          camera.model,
          camera.ip_address,
          camera.power_baluns?.name,
          camera.switches?.name,
          getDvrName(camera.dvr_id),
          camera.channel_number?.toString(),
          ...(diagnostics.get(camera.id)?.map((issue) => issue.message) ?? []),
          ...(connectionIssuesByCamera.get(camera.id)?.map((issue) => issue.details) ?? []),
        ].some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)))
      : filtered

    const map = new Map<string, CameraWithRelations[]>()
    for (const cam of searched) {
      const dvrId = cam.dvr_id || 'sem-dvr'
      if (!map.has(dvrId)) map.set(dvrId, [])
      map.get(dvrId)!.push(cam)
    }
    return map
  }, [cameras, selectedDvr, searchQuery, getDvrName, issuesOnly, diagnostics, connectionIssuesByCamera])

  const handleUpdate = async (formData: Record<string, unknown>) => {
    if (!editing) return { error: 'Nenhuma câmera selecionada para edição.' }
    const selectedCameraId = typeof formData.__camera_id === 'string'
      ? formData.__camera_id
      : editing.id
    const payload = { ...formData }
    delete payload.__camera_id
    const result = await update(selectedCameraId, payload)
    if (!result.error) {
      setEditing(null)
      toast('Câmera e vínculos atualizados com sucesso')
      await fetchData()
    }
    return result
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
      <ClientFilterBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Mapeamento de Canais</h2>
          <p className="text-text-muted text-sm mt-1">
            Localize e corrija câmeras, DVR/canal, Power Balun e switch sem apagar o cadastro.
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
            <option value="sem-dvr">Sem DVR / IP / Wi-Fi</option>
            {dvrs.map((dvr) => (
              <option key={dvr.id} value={dvr.id}>
                {dvr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border-light bg-bg-secondary p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar câmera, canal, DVR, Power Balun, switch, local, IP ou modelo..."
            className="w-full rounded-lg border border-border-light bg-bg-primary py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setIssuesOnly((current) => !current)}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${issuesOnly ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-border-light text-text-secondary hover:bg-bg-tertiary'}`}
        >
          <AlertTriangle className="h-4 w-4" />
          Inconsistências ({issueCount})
        </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {grouped.size === 0 ? (
        <div className="text-center py-16">
          <EmptyState message="Nenhuma câmera encontrada para os filtros informados." />
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
                      <th className="px-4 py-3 text-left font-medium">Diagnóstico</th>
                      <th className="px-4 py-3 text-right font-medium">Corrigir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {cams.map((cam) => {
                      const issues = diagnostics.get(cam.id) ?? []
                      const persistedIssues = connectionIssuesByCamera.get(cam.id) ?? []
                      const hasIssues = issues.length > 0 || persistedIssues.length > 0
                      return (
                      <tr
                        key={cam.id}
                        className={`${hasIssues ? 'bg-amber-500/5' : ''} hover:bg-bg-tertiary/30 transition-colors`}
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

                        <td className="px-4 py-3">
                          {hasIssues ? (
                            <div className="space-y-1">
                              {issues.map((issue) => (
                                <span key={issue.code} className="flex items-center gap-1.5 text-xs text-amber-300">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  {issue.message}
                                </span>
                              ))}
                              {persistedIssues.map((issue) => (
                                <span key={issue.issue_type} className="flex items-center gap-1.5 text-xs text-amber-300">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  {issue.details}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Consistente
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setEditing(cam)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-accent hover:bg-accent/10"
                            title={`Corrigir ${cam.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Corrigir câmera - ${editing?.name ?? ''}`}
        size="lg"
      >
        {editing && (
          <CameraForm
            initialData={editing}
            relocationMode
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
