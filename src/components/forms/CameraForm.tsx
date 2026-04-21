import { useState, useEffect, type FormEvent, useRef } from 'react'
import type { Camera, Dvr, PowerBalun, Switch } from '../../lib/types'
import { STATUS_OPTIONS, CAMERA_TYPES, RESOLUTION_OPTIONS, CONNECTION_TYPES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { uploadQRCodeImage, deleteQRCodeImage } from '../../services/storageService'
import { useAuth } from '../../hooks/useAuth'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { CameraIcon, X, QrCode } from 'lucide-react'

interface CameraFormProps {
  initialData?: Camera | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function CameraForm({ initialData, onSubmit, onCancel }: CameraFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [connectionType, setConnectionType] = useState(initialData?.connection_type ?? 'analogica')
  const [dvrId, setDvrId] = useState(initialData?.dvr_id ?? '')
  const [channelNumber, setChannelNumber] = useState(initialData?.channel_number ?? 1)
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [macAddress, setMacAddress] = useState(initialData?.mac_address ?? '')
  const [poePowered, setPoePowered] = useState(initialData?.poe_powered ?? false)
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [type, setType] = useState(initialData?.type ?? 'dome')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [resolution, setResolution] = useState(initialData?.resolution ?? '1080p')
  const [balunId, setBalunId] = useState(initialData?.balun_id ?? '')
  const [balunPort, setBalunPort] = useState(initialData?.balun_port ?? '')
  const [switchId, setSwitchId] = useState(initialData?.switch_id ?? '')
  const [switchPort, setSwitchPort] = useState(initialData?.switch_port ?? '')
  const [rtspUrl, setRtspUrl] = useState(initialData?.rtsp_url ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [qrCodeUrl, setQrCodeUrl] = useState(initialData?.qr_code_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingQr, setUploadingQr] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [baluns, setBaluns] = useState<PowerBalun[]>([])
  const [switches, setSwitches] = useState<Switch[]>([])

  const isIP = connectionType === 'ip'

  useEffect(() => {
    supabase.from('dvrs').select('id, name').order('name').then(({ data }) => setDvrs((data as Dvr[]) || []))
    supabase.from('power_baluns').select('id, name, total_ports').order('name').then(({ data }) => setBaluns((data as PowerBalun[]) || []))
    supabase.from('switches').select('id, name, is_poe, total_ports').order('name').then(({ data }) => setSwitches((data as Switch[]) || []))
  }, [])

  // Auto-mark PoE when selecting a PoE switch for IP cameras
  useEffect(() => {
    if (isIP && switchId) {
      const sw = switches.find((s) => s.id === switchId)
      if (sw?.is_poe) setPoePowered(true)
    }
  }, [switchId, isIP, switches])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      name,
      brand: brand || null,
      connection_type: connectionType,
      dvr_id: !isIP && dvrId ? dvrId : null,
      channel_number: !isIP && channelNumber ? channelNumber : null,
      ip_address: isIP && ipAddress ? ipAddress : null,
      mac_address: isIP && macAddress ? macAddress : null,
      poe_powered: isIP ? poePowered : false,
      location,
      type,
      status,
      resolution,
      balun_id: !isIP && balunId ? balunId : null,
      balun_port: !isIP && balunPort ? Number(balunPort) : null,
      switch_id: switchId || null,
      switch_port: switchPort ? Number(switchPort) : null,
      rtsp_url: rtspUrl || null,
      qr_code_url: qrCodeUrl || null,
      notes: notes || null,
    })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  const poeSwitches = switches.filter((s) => s.is_poe)

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingQr(true)

    // Se já tinha uma imagem anterior, remove
    if (qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) {
      await deleteQRCodeImage(qrCodeUrl)
    }

    const result = await uploadQRCodeImage(file, user.id, initialData?.id)
    if (result.error) {
      setError('Erro ao fazer upload da foto: ' + result.error)
    } else if (result.url) {
      setQrCodeUrl(result.url)
      setError(null)
    }
    setUploadingQr(false)
    e.target.value = ''
  }

  const handleRemoveQr = async () => {
    if (qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) {
      await deleteQRCodeImage(qrCodeUrl)
    }
    setQrCodeUrl('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Connection Type Toggle */}
      <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg w-fit">
        {CONNECTION_TYPES.map((ct) => (
          <button
            key={ct.value}
            type="button"
            onClick={() => setConnectionType(ct.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              connectionType === ct.value
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {ct.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Intelbras, Hikvision" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Estacionamento" />
      </div>

      {/* Analógica: DVR + Canal */}
      {!isIP && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="DVR"
            value={dvrId}
            onChange={(e) => setDvrId(e.target.value)}
            options={dvrs.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Selecione o DVR"
            required
          />
          <Select
            label="Canal"
            value={channelNumber}
            onChange={(e) => setChannelNumber(Number(e.target.value))}
            options={Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Canal ${i + 1}` }))}
            required
          />
        </div>
      )}

      {/* IP: Endereço IP + MAC */}
      {isIP && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Endereço IP"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            required
            placeholder="192.168.1.100"
          />
          <Input
            label="MAC Address (opcional)"
            value={macAddress}
            onChange={(e) => setMacAddress(e.target.value)}
            placeholder="AA:BB:CC:DD:EE:FF"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} options={CAMERA_TYPES} />
        <Select label="Resolução" value={resolution} onChange={(e) => setResolution(e.target.value)} options={RESOLUTION_OPTIONS} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
      </div>

      {/* Balun - only for analog cameras */}
      {!isIP && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Power Balun (opcional)"
            value={balunId}
            onChange={(e) => setBalunId(e.target.value)}
            options={baluns.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Nenhum"
          />
          <Select
            label="Porta do Balun"
            value={balunPort}
            onChange={(e) => setBalunPort(e.target.value)}
            options={(() => {
              const b = baluns.find((x) => x.id === balunId)
              const max = b?.total_ports ?? 16
              return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: `Porta ${i + 1}` }))
            })()}
            placeholder="Selecione"
          />
        </div>
      )}

      {/* Switch - available for both, but especially important for IP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={isIP ? 'Switch PoE' : 'Switch (opcional)'}
          value={switchId}
          onChange={(e) => setSwitchId(e.target.value)}
          options={(isIP ? poeSwitches.length > 0 ? poeSwitches : switches : switches).map((s) => ({
            value: s.id,
            label: `${s.name}${s.is_poe ? ' ⚡' : ''}`,
          }))}
          placeholder="Nenhum"
          required={isIP}
        />
        <Select
          label="Porta do Switch"
          value={switchPort}
          onChange={(e) => setSwitchPort(e.target.value)}
          options={(() => {
            const s = switches.find((x) => x.id === switchId)
            const max = s?.total_ports ?? 24
            return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: `Porta ${i + 1}` }))
          })()}
          placeholder="Selecione"
          required={isIP}
        />
      </div>

      {/* PoE checkbox for IP cameras */}
      {isIP && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={poePowered}
            onChange={(e) => setPoePowered(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-accent"
          />
          <span className="text-sm text-text-primary">Alimentação via PoE</span>
        </label>
      )}

      <Input
        label="URL RTSP (opcional)"
        value={rtspUrl}
        onChange={(e) => setRtspUrl(e.target.value)}
        placeholder="rtsp://usuario:senha@192.168.1.100:554/stream1"
      />
      {/* ── QR Code / Foto de acesso ── */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5" />
          Foto do QR Code de Acesso
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleQrFileChange}
          className="hidden"
        />

        {qrCodeUrl ? (
          <div className="relative w-fit group">
            <img
              src={qrCodeUrl}
              alt="QR Code da câmera"
              className="w-48 h-48 object-contain border border-border-light rounded-lg bg-bg-primary"
            />
            <button
              type="button"
              onClick={handleRemoveQr}
              className="absolute -top-2 -right-2 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 px-2 py-1 bg-bg-tertiary/90 backdrop-blur-sm text-text-primary text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Substituir
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingQr}
            className="w-full sm:w-auto flex items-center gap-2 px-4 py-8 border-2 border-dashed border-border-light rounded-lg text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            {uploadingQr ? (
              <span className="animate-pulse">Enviando...</span>
            ) : (
              <>
                <CameraIcon className="w-5 h-5" />
                <span>Tirar foto do QR Code</span>
                <span className="text-xs opacity-60">(ou selecionar arquivo)</span>
              </>
            )}
          </button>
        )}

        <p className="text-xs text-text-muted">
          Bata uma foto do QR Code do app da câmera para acessar de outro dispositivo.
        </p>
      </div>

      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
