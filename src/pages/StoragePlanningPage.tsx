import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Camera, Database, HardDrive, Info, Server } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Input from '../components/ui/Input'
import { calculateCameraStorage, calculateRequiredStorageTb, calculateRetentionDays, formatCodec, type RecordingCodec, type RecordingMode } from '../lib/recordingStorage'

interface StorageCamera {
  id: string
  name: string
  resolution: string | null
  status: string
  dvr_id: string | null
  recording_codec: RecordingCodec | null
  recording_fps: number | null
  recording_bitrate_kbps: number | null
  recording_mode: RecordingMode | null
  motion_recording_percent: number | null
}

interface StorageDvr {
  id: string
  name: string
  hd_capacity_tb: number | null
  hd_brand: string | null
  hd_model: string | null
}

const RETENTION_PERIODS = [7, 15, 30, 60, 90]

const formatTb = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TB`

export default function StoragePlanningPage() {
  const { selectedClientId } = useClient()
  const [cameras, setCameras] = useState<StorageCamera[]>([])
  const [dvrs, setDvrs] = useState<StorageDvr[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(30)
  const [reservePercent, setReservePercent] = useState(10)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (!selectedClientId) {
        setCameras([])
        setDvrs([])
        setLoading(false)
        return
      }
      const [cameraResult, dvrResult] = await Promise.all([
        supabase.from('cameras').select('id,name,resolution,status,dvr_id,recording_codec,recording_fps,recording_bitrate_kbps,recording_mode,motion_recording_percent').eq('client_id', selectedClientId).order('name'),
        supabase.from('dvrs').select('id,name,hd_capacity_tb,hd_brand,hd_model').eq('client_id', selectedClientId).order('name'),
      ])
      setCameras((cameraResult.data || []) as StorageCamera[])
      setDvrs((dvrResult.data || []) as StorageDvr[])
      setLoading(false)
    }
    void load()
  }, [selectedClientId])

  const activeCameras = useMemo(() => cameras.filter(camera => camera.status !== 'inativo'), [cameras])
  const totalDailyGb = activeCameras.reduce((sum, camera) => sum + calculateCameraStorage(camera).gbPerDay, 0)
  const totalInstalledTb = dvrs.reduce((sum, dvr) => sum + Number(dvr.hd_capacity_tb || 0), 0)
  const totalRequiredTb = calculateRequiredStorageTb(activeCameras, selectedDays)
  const manualCount = activeCameras.filter(camera => Number(camera.recording_bitrate_kbps || 0) > 0).length
  const estimatedCount = activeCameras.length - manualCount
  const unassignedCameras = activeCameras.filter(camera => !camera.dvr_id)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <ClientFilterBanner />
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><HardDrive className="w-5 h-5 text-primary" /> Armazenamento e retenção</h1>
        <p className="text-sm text-text-muted mt-1">Dimensionamento de gravação por câmera, DVR/NVR e projeto.</p>
      </div>

      <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Período do cenário</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {RETENTION_PERIODS.map(days => (
                <button key={days} type="button" onClick={() => setSelectedDays(days)} className={`rounded-lg px-3 py-2 text-sm font-medium border ${selectedDays === days ? 'bg-primary/15 border-primary text-primary' : 'bg-bg-primary border-border-light text-text-secondary'}`}>{days} dias</button>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-48">
            <Input label="Reserva técnica do HD (%)" type="number" min="0" max="50" value={reservePercent} onChange={event => setReservePercent(Math.min(50, Math.max(0, Number(event.target.value || 0))))} />
          </div>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-text-secondary flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>O cálculo utiliza GB/TB decimais. Bitrates vazios são estimados por resolução, codec e FPS. Gravação por movimento aplica o percentual de atividade cadastrado.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Câmeras calculadas', value: activeCameras.length, detail: `${cameras.length - activeCameras.length} inativa(s) ignorada(s)`, icon: Camera },
          { label: 'Consumo diário', value: `${totalDailyGb.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`, detail: 'por dia de gravação', icon: Database },
          { label: `Necessário / ${selectedDays} dias`, value: formatTb(totalRequiredTb), detail: 'sem descontar HD instalado', icon: HardDrive },
          { label: 'HD instalado', value: formatTb(totalInstalledTb), detail: `${100 - reservePercent}% considerado utilizável`, icon: Server },
          { label: 'Origem dos bitrates', value: `${manualCount} / ${estimatedCount}`, detail: 'informados / estimados', icon: Info },
        ].map(item => (
          <div key={item.label} className="bg-bg-secondary border border-border-light rounded-xl p-3">
            <div className="flex items-center gap-2 text-[11px] text-text-muted"><item.icon className="w-3.5 h-3.5" /> {item.label}</div>
            <p className="text-lg font-bold text-text-primary mt-2">{item.value}</p>
            <p className="text-[10px] text-text-muted mt-1">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Comparativo do projeto</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {RETENTION_PERIODS.map(days => {
            const required = calculateRequiredStorageTb(activeCameras, days)
            return <button key={days} type="button" onClick={() => setSelectedDays(days)} className={`rounded-lg border p-3 text-left ${selectedDays === days ? 'border-primary bg-primary/10' : 'border-border-light bg-bg-primary/40'}`}><span className="text-xs text-text-muted">{days} dias</span><strong className="block text-sm text-text-primary mt-1">{formatTb(required)}</strong></button>
          })}
        </div>
      </div>

      <div className="space-y-3">
        {dvrs.map(dvr => {
          const dvrCameras = activeCameras.filter(camera => camera.dvr_id === dvr.id)
          const dailyGb = dvrCameras.reduce((sum, camera) => sum + calculateCameraStorage(camera).gbPerDay, 0)
          const requiredTb = calculateRequiredStorageTb(dvrCameras, selectedDays)
          const installedTb = Number(dvr.hd_capacity_tb || 0)
          const retentionDays = calculateRetentionDays(dvrCameras, installedTb, reservePercent)
          return (
            <section key={dvr.id} className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-light bg-bg-primary/35 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div><h2 className="font-semibold text-text-primary flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> {dvr.name}</h2><p className="text-xs text-text-muted mt-1">{dvrCameras.length} câmera(s) · {dailyGb.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB/dia</p></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div><span className="text-text-muted block">HD instalado</span><strong className="text-text-primary">{installedTb > 0 ? formatTb(installedTb) : 'Não informado'}</strong></div>
                  <div><span className="text-text-muted block">Retenção estimada</span><strong className="text-primary">{retentionDays == null ? '-' : `${retentionDays.toLocaleString('pt-BR')} dias`}</strong></div>
                  <div><span className="text-text-muted block">Necessário</span><strong className="text-text-primary">{formatTb(requiredTb)}</strong></div>
                </div>
              </div>
              {dvrCameras.length === 0 ? <p className="text-sm text-text-muted text-center py-6">Nenhuma câmera ativa vinculada.</p> : (
                <div className="divide-y divide-border-light/50">
                  {dvrCameras.map(camera => {
                    const estimate = calculateCameraStorage(camera)
                    return <div key={camera.id} className="p-3 grid grid-cols-1 sm:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 text-xs"><strong className="text-text-primary">{camera.name}</strong><span className="text-text-muted">{camera.resolution || '1080p'} · {formatCodec(camera.recording_codec)}</span><span className="text-text-muted">{camera.recording_fps || 15} FPS</span><span className={estimate.bitrateSource === 'manual' ? 'text-success' : 'text-warning'}>{estimate.bitrateKbps.toLocaleString('pt-BR')} Kbps {estimate.bitrateSource === 'estimated' ? '(est.)' : ''}</span><span className="text-text-primary font-medium">{estimate.gbPerDay.toLocaleString('pt-BR')} GB/dia</span></div>
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {unassignedCameras.length > 0 && (
        <section className="bg-warning/5 border border-warning/30 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-warning flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Câmeras sem DVR/NVR definido</h2>
          <p className="text-xs text-text-muted">O consumo entra no total do projeto, mas não pode ser comparado com um HD específico até que o destino de gravação seja cadastrado.</p>
          <div className="flex flex-wrap gap-2">{unassignedCameras.map(camera => <span key={camera.id} className="rounded-md border border-warning/20 bg-bg-secondary px-2 py-1 text-xs text-text-secondary">{camera.name}</span>)}</div>
        </section>
      )}
    </div>
  )
}
