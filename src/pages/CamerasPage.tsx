import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Cable, QrCode, HardDrive, Wifi, LayoutGrid, MapPin, ArrowLeftRight, Search, X, Pencil, Trash2 } from 'lucide-react'
import { useCameras } from '../hooks/useCameras'
import { useDvrs } from '../hooks/useDvrs'
import { useBaluns } from '../hooks/useBaluns'
import type { Camera } from '../lib/types'
import { CABLE_TYPE_LABELS, CAMERA_TECHNOLOGY_LABELS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import DataTable, { type Column } from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CameraForm from '../components/forms/CameraForm'
import UtpCableForm from '../components/forms/UtpCableForm'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import { getInstallationPhotoUrl, getQRCodeImageUrl } from '../services/storageService'
import { listCameraInstallationPhotos } from '../services/cameraInstallationPhotosService'
import { buildCameraPhotoGallery, type CameraPhotoGalleryItem } from '../lib/cameraInstallationPhotos'
import { byDirection, compareIpAddress, compareNumbers, naturalCompare } from '../lib/sorting'
import { channelKindLabel, classifyDvrChannel } from '../lib/dvrChannels'

const getPowerSourceLabel = (camera: Camera) => {
  if (camera.power_source_type === 'poe' || camera.poe_powered) return 'PoE'
  if (camera.power_source_type === 'power_balun') return 'Power Balun'
  if (camera.power_source_type === 'power_supply') {
    const current = camera.power_supply_current_a ? `${String(camera.power_supply_current_a).replace('.', ',')}A` : ''
    const voltage = camera.power_supply_voltage || '12V'
    const model = camera.power_supply_model || camera.power_supply_brand || ''
    return [voltage, current, model].filter(Boolean).join(' · ')
  }
  return '-'
}

const normalizeSearch = (value: unknown) =>
  String(value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export default function CamerasPage() {
  const { data, loading, create, update, remove } = useCameras()
  const { data: dvrs } = useDvrs()
  const { data: baluns } = useBaluns()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Camera | null>(null)
  const [relocationMode, setRelocationMode] = useState(false)
  const [deleting, setDeleting] = useState<Camera | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [cableCamera, setCableCamera] = useState<Camera | null>(null)
  const [qrCamera, setQrCamera] = useState<Camera | null>(null)
  const [photoCamera, setPhotoCamera] = useState<Camera | null>(null)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [photoPreviewItems, setPhotoPreviewItems] = useState<Array<CameraPhotoGalleryItem & { url: string | null }>>([])
  const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; alt: string } | null>(null)
  const [cableTypes, setCableTypes] = useState<Record<string, string>>({})
  const [cameraMediaCounts, setCameraMediaCounts] = useState<Record<string, number>>({})
  const [sortKey, setSortKey] = useState<string>('channel_number')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  // activeTab: 'all' = todas; 'ip' = IP sem DVR; ou id do DVR
  const [activeTab, setActiveTab] = useState<string>('all')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadQrPreview() {
      if (!qrCamera?.qr_code_url) {
        setQrPreviewUrl(null)
        return
      }
      const signedUrl = await getQRCodeImageUrl(qrCamera.qr_code_url)
      if (!cancelled) setQrPreviewUrl(signedUrl)
    }
    loadQrPreview()
    return () => {
      cancelled = true
    }
  }, [qrCamera])

  useEffect(() => {
    let cancelled = false
    async function loadPhotoPreview() {
      if (!photoCamera) {
        setPhotoPreviewItems([])
        return
      }
      const result = await listCameraInstallationPhotos(photoCamera.id)
      const gallery = buildCameraPhotoGallery({
        legacyPhotoUrl: photoCamera.installation_photo_url,
        photos: result.data,
      })
      const entries = await Promise.all(
        gallery.map(async (photo) => ({
          ...photo,
          url: await getInstallationPhotoUrl(photo.storagePath),
        })),
      )
      if (!cancelled) {
        setPhotoPreviewItems(entries)
      }
    }
    loadPhotoPreview()
    return () => {
      cancelled = true
    }
  }, [photoCamera])

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aData = a as unknown as Record<string, unknown>
      const bData = b as unknown as Record<string, unknown>
      let result = 0

      if (sortKey === 'ip_address') {
        result = compareIpAddress(aData.ip_address, bData.ip_address)
      } else if (sortKey === 'channel_number') {
        result = compareNumbers(aData.channel_number, bData.channel_number)
      } else if (sortKey === 'ir_distance_meters') {
        result = compareNumbers(aData.ir_distance_meters, bData.ir_distance_meters)
      } else {
        result = naturalCompare(aData[sortKey], bData[sortKey])
      }

      return byDirection(result, sortDir) || naturalCompare(a.name, b.name)
    })
  }, [data, sortKey, sortDir])

  // Dados filtrados pela aba ativa
  const filteredData = useMemo(() => {
    const byTab = (() => {
      if (activeTab === 'all') return sortedData
      if (activeTab === 'ip') return sortedData.filter((c) => c.connection_type === 'ip' && !c.dvr_id)
      return sortedData.filter((c) => c.dvr_id === activeTab)
    })()

    const query = normalizeSearch(searchQuery.trim())
    if (!query) return byTab

    return byTab.filter((camera) => {
      const searchable = [
        camera.name,
        camera.location,
        camera.ip_address,
        camera.model,
        camera.brand,
        camera.dvrs?.name,
        camera.channel_number,
        camera.ir_distance_meters,
        CAMERA_TECHNOLOGY_LABELS[camera.technology || ''],
      ]
      return searchable.some((value) => normalizeSearch(value).includes(query))
    })
  }, [sortedData, activeTab, searchQuery])

  // DVRs ordenados alfanumericamente (DVR 1, DVR 2, ... DVR 10) — menor para maior
  const sortedDvrs = useMemo(() => {
    return [...dvrs].sort((a, b) => naturalCompare(a.name, b.name))
  }, [dvrs])
  const balunById = useMemo(() => new Map(baluns.map((balun) => [balun.id, balun])), [baluns])

  // Contagens por aba
  const counts = useMemo(() => {
    const byDvr: Record<string, number> = {}
    let ipOnly = 0
    for (const c of data) {
      if (c.dvr_id) {
        byDvr[c.dvr_id] = (byDvr[c.dvr_id] ?? 0) + 1
      } else if (c.connection_type === 'ip') {
        ipOnly++
      }
    }
    return { byDvr, ipOnly, total: data.length }
  }, [data])

  // Fetch cable types for all cameras to show badge
  const fetchCableTypes = useCallback(async () => {
    const cameraIds = data.map((camera) => camera.id)
    if (cameraIds.length === 0) {
      setCableTypes({})
      return
    }

    const { data: cableRows } = await supabase
      .from('cable_connections')
      .select('camera_id, cable_type')
      .in('camera_id', cameraIds)
    if (cableRows) {
      const map: Record<string, string> = {}
      for (const row of cableRows) {
        map[row.camera_id] = row.cable_type
      }
      setCableTypes(map)
    }
  }, [data])

  useEffect(() => {
    if (!loading) fetchCableTypes()
  }, [loading, fetchCableTypes])

  useEffect(() => {
    const cameraIds = data.map((camera) => camera.id)
    if (cameraIds.length === 0) {
      setCameraMediaCounts({})
      return
    }

    let cancelled = false
    async function loadMediaCounts() {
      const { data: rows } = await supabase
        .from('camera_installation_photos')
        .select('camera_id')
        .in('camera_id', cameraIds)
      if (cancelled) return
      const counts: Record<string, number> = {}
      for (const row of rows || []) {
        counts[row.camera_id] = (counts[row.camera_id] ?? 0) + 1
      }
      setCameraMediaCounts(counts)
    }
    loadMediaCounts()
    return () => {
      cancelled = true
    }
  }, [data])

  const columns: Column<Camera>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    {
      key: 'connection_type',
      label: 'Conexão',
      render: (c) =>
        c.connection_type === 'ip' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400">
            IP{c.poe_powered ? ' ⚡' : ''}
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-500/15 text-slate-400">
            Analógica
          </span>
        ),
    },
    {
      key: 'technology',
      label: 'Tecnologia',
      sortable: true,
      render: (c) => c.technology ? (
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-violet-500/15 text-violet-300">
          {CAMERA_TECHNOLOGY_LABELS[c.technology] || c.technology}
        </span>
      ) : (
        <span className="text-text-muted text-xs">-</span>
      ),
    },
    {
      key: 'power_source_type',
      label: 'Alimentação',
      render: (c) => {
        const label = getPowerSourceLabel(c)
        if (label === '-') return <span className="text-text-muted text-xs">-</span>
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-300">
            {label}
          </span>
        )
      },
    },
    {
      key: 'balun_id',
      label: 'Balun',
      render: (c) => {
        const balun = c.balun_id ? balunById.get(c.balun_id) : null
        return balun ? (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${balun.balun_type === 'passive' ? 'bg-amber-500/15 text-amber-300' : 'bg-cyan-500/15 text-cyan-300'}`}>
            {balun.name} · {balun.balun_type === 'passive' ? 'Passivo' : 'Power'}
          </span>
        ) : (
          <span className="text-text-muted text-xs">-</span>
        )
      },
    },
    {
      key: 'dvr',
      label: 'DVR / IP',
      render: (c) =>
        c.connection_type === 'ip'
          ? c.ip_address ?? '-'
          : c.dvrs?.name ?? '-',
    },
    {
      key: 'channel_number',
      label: 'Canal',
      sortable: true,
      render: (c) => {
        if (c.channel_number == null) return '-'
        const kind = classifyDvrChannel(c.channel_number, c.dvrs?.analog_channels, c.connection_type, c.dvrs?.disabled_analog_channels)
        const badge = channelKindLabel(kind)
        return (
          <span className="inline-flex items-center gap-1.5">
            {c.channel_number}
            {badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  kind === 'ip'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {badge}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'ir_distance_meters',
      label: 'IR',
      sortable: true,
      render: (c) => c.ir_distance_meters ? `${c.ir_distance_meters} m` : '-',
    },
    { key: 'location', label: 'Localização', sortable: true },
    { key: 'type', label: 'Tipo', render: (c) => c.type.charAt(0).toUpperCase() + c.type.slice(1) },
    {
      key: 'cable',
      label: 'Cabo',
      render: (c) => {
        const ct = cableTypes[c.id]
        if (!ct) return <span className="text-text-muted text-xs">-</span>
        const label = CABLE_TYPE_LABELS[ct] || ct
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent">
            {label}
          </span>
        )
      },
    },
    {
      key: 'qr_code',
      label: 'QR Code',
      render: (c) =>
        c.qr_code_url ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setQrCamera(c)
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
          >
            <QrCode className="w-3 h-3" />
            Ver
          </button>
        ) : (
          <span className="text-text-muted text-xs">-</span>
        ),
    },
    {
      key: 'installation_photo',
      label: 'Mídias',
      render: (c) =>
        c.installation_photo_url || cameraMediaCounts[c.id] ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setPhotoCamera(c)
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            <MapPin className="w-3 h-3" />
            Ver{cameraMediaCounts[c.id] ? ` (${cameraMediaCounts[c.id] + (c.installation_photo_url ? 1 : 0)})` : ''}
          </button>
        ) : (
          <span className="text-text-muted text-xs">-</span>
        ),
    },
    { key: 'status', label: 'Status', render: (c) => <Badge status={c.status} /> },
  ]

  const handleSubmit = async (formData: Record<string, unknown>) => {
    const targetCameraId = typeof formData.__camera_id === 'string' ? formData.__camera_id : ''
    const payload = { ...formData }
    delete payload.__camera_id

    if (editing || targetCameraId) {
      const result = await update(editing?.id ?? targetCameraId, payload)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        setRelocationMode(false)
        toast(targetCameraId && !editing ? 'Câmera existente atualizada com sucesso' : 'Câmera atualizada com sucesso')
      }
      return result
    }
    const result = await create(payload as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast('Câmera criada com sucesso')
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) toast('Câmera excluída com sucesso')
    else toast(result.error, 'error')
    setDeleteLoading(false)
    setDeleting(null)
  }

  const openCamera = (camera: Camera, shouldRelocate = false) => {
    setEditing(camera)
    setRelocationMode(shouldRelocate)
    setModalOpen(true)
  }

  const mobileChannelItems = filteredData
    .filter((camera) => camera.channel_number != null)
    .sort((a, b) => compareNumbers(a.channel_number, b.channel_number) || naturalCompare(a.name, b.name))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Câmeras</h2>
          <p className="text-text-muted text-sm mt-1">
            {activeTab === 'all'
              ? `${data.length} registro(s)`
              : `${filteredData.length} de ${data.length} registro(s)`}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setRelocationMode(false); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Nova Câmera
        </Button>
      </div>

      <div className="rounded-xl border border-border-light bg-bg-secondary p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por canal, nome, local, IP, modelo ou DVR..."
            className="w-full rounded-lg border border-border-light bg-bg-primary py-2.5 pl-9 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
              title="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs text-text-muted">
            {filteredData.length} resultado(s) encontrado(s) para "{searchQuery}".
          </p>
        )}
      </div>

      {mobileChannelItems.length > 0 && (
        <div className="md:hidden sticky top-0 z-20 -mx-4 border-y border-border-light bg-bg-primary/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/80">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Abrir por canal</span>
            <span className="text-[11px] text-text-muted">{mobileChannelItems.length} canal(is)</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mobileChannelItems.map((camera) => (
              <button
                key={`channel-shortcut-${camera.id}`}
                type="button"
                onClick={() => openCamera(camera)}
                className="shrink-0 rounded-lg border border-border-light bg-bg-secondary px-3 py-2 text-left transition-colors hover:border-accent hover:text-accent"
                title={`Abrir ${camera.name}`}
              >
                <span className="block text-xs font-bold text-accent">CH {camera.channel_number}</span>
                <span className="block max-w-24 truncate text-[11px] text-text-muted">{camera.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abas por DVR */}
      <div className="flex flex-wrap gap-2 border-b border-border-light pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-accent/15 text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Todas
          <span className="px-1.5 py-0.5 rounded-full bg-bg-primary text-xs">
            {counts.total}
          </span>
        </button>

        {sortedDvrs.map((dvr) => {
          const used = counts.byDvr[dvr.id] ?? 0
          const isActive = activeTab === dvr.id
          return (
            <button
              key={dvr.id}
              onClick={() => setActiveTab(dvr.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
              }`}
              title={`${dvr.location ?? ''}`}
            >
              <HardDrive className="w-4 h-4" />
              {dvr.name}
              <span className="px-1.5 py-0.5 rounded-full bg-bg-primary text-xs">
                {used}/{dvr.total_channels}
              </span>
            </button>
          )
        })}

        {counts.ipOnly > 0 && (
          <button
            onClick={() => setActiveTab('ip')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'ip'
                ? 'bg-accent/15 text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
            }`}
          >
            <Wifi className="w-4 h-4" />
            IP (sem DVR)
            <span className="px-1.5 py-0.5 rounded-full bg-bg-primary text-xs">
              {counts.ipOnly}
            </span>
          </button>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {filteredData.length === 0 ? (
          <div className="rounded-xl border border-border-light bg-bg-secondary p-6 text-center text-sm text-text-muted">
            Nenhum registro encontrado
          </div>
        ) : (
          filteredData.map((camera) => {
            const connectionLabel = camera.connection_type === 'ip'
              ? `IP${camera.poe_powered ? ' · PoE' : ''}`
              : 'Analógica'
            const dvrOrIp = camera.connection_type === 'ip'
              ? camera.ip_address ?? 'IP não informado'
              : camera.dvrs?.name ?? 'DVR não informado'
            const cableType = cableTypes[camera.id]
            const mediaCount = (cameraMediaCounts[camera.id] ?? 0) + (camera.installation_photo_url ? 1 : 0)

            return (
              <div
                key={`mobile-camera-${camera.id}`}
                className="rounded-xl border border-border-light bg-bg-secondary p-3"
              >
                <button
                  type="button"
                  onClick={() => openCamera(camera)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
                      <span className="text-[10px] font-semibold uppercase text-accent/80">Canal</span>
                      <span className="text-lg font-bold leading-none text-accent">{camera.channel_number ?? '-'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-text-primary">{camera.name}</h3>
                          <p className="mt-0.5 truncate text-xs text-text-muted">{camera.location || 'Sem localização'}</p>
                        </div>
                        <Badge status={camera.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-blue-500/15 text-blue-300">
                          {connectionLabel}
                        </span>
                        {camera.technology && (
                          <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-violet-500/15 text-violet-300">
                            {CAMERA_TECHNOLOGY_LABELS[camera.technology] || camera.technology}
                          </span>
                        )}
                        {cableType && (
                          <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-accent/15 text-accent">
                            {CABLE_TYPE_LABELS[cableType] || cableType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-bg-primary px-3 py-2">
                      <span className="block text-text-muted">DVR / IP</span>
                      <span className="mt-0.5 block truncate font-medium text-text-primary">{dvrOrIp}</span>
                    </div>
                    <div className="rounded-lg bg-bg-primary px-3 py-2">
                      <span className="block text-text-muted">Alimentação</span>
                      <span className="mt-0.5 block truncate font-medium text-text-primary">{getPowerSourceLabel(camera)}</span>
                    </div>
                  </div>
                </button>

                <div className="mt-3 flex items-center justify-between border-t border-border-light pt-2">
                  <div className="flex items-center gap-1">
                    {camera.qr_code_url && (
                      <button
                        type="button"
                        onClick={() => setQrCamera(camera)}
                        className="p-2 rounded-lg text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                        title="Ver QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    )}
                    {(camera.installation_photo_url || mediaCount > 0) && (
                      <button
                        type="button"
                        onClick={() => setPhotoCamera(camera)}
                        className="p-2 rounded-lg text-text-muted hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                        title="Ver mídias"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openCamera(camera, true)}
                      className="p-2 rounded-lg text-text-muted hover:bg-accent/10 hover:text-accent transition-colors"
                      title="Realocar canal/porta"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCableCamera(camera)}
                      className="p-2 rounded-lg text-text-muted hover:bg-accent/10 hover:text-accent transition-colors"
                      title="Cabeamento"
                    >
                      <Cable className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openCamera(camera)}
                      className="p-2 rounded-lg text-text-muted hover:bg-accent/10 hover:text-accent transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(camera)}
                      className="p-2 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden bg-bg-secondary border border-border-light rounded-xl overflow-hidden md:block">
        <DataTable
          columns={columns}
          data={filteredData}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={(item) => openCamera(item)}
          onDelete={(item) => setDeleting(item)}
          onRowClick={(item) => openCamera(item)}
          extraActions={(item) => (
            <div className="inline-flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openCamera(item, true)
                }}
                className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
                title="Realocar canal/porta"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCableCamera(item)
                }}
                className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
                title="Cabeamento"
              >
                <Cable className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setRelocationMode(false) }}
        title={editing ? relocationMode ? 'Realocar Câmera' : 'Editar Câmera' : 'Nova Câmera'}
        size="lg"
      >
        <CameraForm
          initialData={editing}
          relocationMode={relocationMode}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); setRelocationMode(false) }}
        />
      </Modal>

      <Modal
        open={!!cableCamera}
        onClose={() => setCableCamera(null)}
        title={`Cabeamento - ${cableCamera?.name ?? ''}`}
        size="lg"
      >
        {cableCamera && (
          <UtpCableForm
            anchorCameraId={cableCamera.id}
            onClose={() => setCableCamera(null)}
            onSaved={() => {
              fetchCableTypes()
              toast('Cabeamento salvo com sucesso')
            }}
          />
        )}
      </Modal>

      {/* Modal de visualização do QR Code */}
      <Modal
        open={!!qrCamera}
        onClose={() => setQrCamera(null)}
        title={`QR Code - ${qrCamera?.name ?? ''}`}
        size="sm"
      >
        {qrCamera?.qr_code_url && (
          <div className="flex flex-col items-center gap-4">
            {qrPreviewUrl ? (
              <img
                src={qrPreviewUrl}
                alt={`QR Code da câmera ${qrCamera.name}`}
                className="max-w-full rounded-lg border border-border-light"
              />
            ) : (
              <div className="w-48 h-48 rounded-lg border border-border-light bg-bg-secondary flex items-center justify-center text-xs text-text-muted">
                Preparando QR...
              </div>
            )}
            <p className="text-sm text-text-muted text-center">
              Use o app da câmera para escanear este QR Code e acessar o dispositivo.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQrCamera(null)}
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal de visualização da Foto do Local de Instalação */}
      <Modal
        open={!!photoCamera}
        onClose={() => setPhotoCamera(null)}
        title={`Mídias do Local - ${photoCamera?.name ?? ''}`}
        size="md"
      >
        {photoCamera && (
          <div className="flex flex-col items-center gap-4">
            {photoPreviewItems.length > 0 ? (
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {photoPreviewItems.map((item, index) => (
                  <div key={`${item.id || 'legacy'}-${item.storagePath}`} className="relative overflow-hidden rounded-lg border border-border-light bg-bg-primary">
                    {item.url ? (
                      item.mediaKind === 'video' ? (
                        <video
                          src={item.url}
                          controls
                          preload="metadata"
                          className="aspect-video w-full bg-black object-contain"
                          aria-label={`Vídeo ${index + 1} do local da câmera ${photoCamera.name}`}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFullscreenPhoto({
                            url: item.url || '',
                            alt: `Foto ${index + 1} do local da câmera ${photoCamera.name}`,
                          })}
                          className="block w-full"
                          title="Ver foto em tela cheia"
                        >
                          <img
                            src={item.url}
                            alt={`Foto ${index + 1} do local da câmera ${photoCamera.name}`}
                            className="aspect-video w-full cursor-zoom-in object-cover"
                          />
                        </button>
                      )
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-xs text-text-muted">
                        Preparando mídia...
                      </div>
                    )}
                    <div className="absolute left-2 top-2 rounded bg-bg-primary/85 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {item.mediaKind === 'video' ? 'Vídeo' : 'Foto'} {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full min-h-48 rounded-lg border border-border-light bg-bg-secondary flex items-center justify-center text-xs text-text-muted">
                Nenhuma mídia encontrada.
              </div>
            )}
            {photoCamera.location && (
              <p className="text-sm text-text-secondary text-center flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {photoCamera.location}
              </p>
            )}
            <p className="text-xs text-text-muted text-center">
              Referência visual para conferência física do local de instalação.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPhotoCamera(null)}
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setFullscreenPhoto(null)
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Fechar foto"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={fullscreenPhoto.url}
            alt={fullscreenPhoto.alt}
            className="max-h-[92vh] max-w-[96vw] rounded-lg border border-white/10 object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir Câmera"
        message={`Tem certeza que deseja excluir a câmera "${deleting?.name}"?`}
        loading={deleteLoading}
      />
    </div>
  )
}
