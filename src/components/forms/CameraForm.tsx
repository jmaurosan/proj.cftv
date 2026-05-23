import { useState, useEffect, useMemo, type FormEvent, useRef } from 'react'
import type { Camera, Dvr, PowerBalun, Switch } from '../../lib/types'
import { STATUS_OPTIONS, CAMERA_TYPES, RESOLUTION_OPTIONS, CONNECTION_TYPES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { uploadQRCodeImage, deleteQRCodeImage, uploadInstallationPhoto, deleteInstallationPhoto } from '../../services/storageService'
import { useAuth } from '../../hooks/useAuth'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import CameraPreview from '../ui/CameraPreview'
import { CameraIcon, X, QrCode, Package, MapPin, Monitor } from 'lucide-react'

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
  const [streamUrl, setStreamUrl] = useState(initialData?.rtsp_url ?? '')
  const [streamMode, setStreamMode] = useState<'auto' | 'manual'>('auto')
  const [streamUser, setStreamUser] = useState('')
  const [streamPass, setStreamPass] = useState('')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [qrCodeUrl, setQrCodeUrl] = useState(initialData?.qr_code_url ?? '')
  const [installationPhotoUrl, setInstallationPhotoUrl] = useState(initialData?.installation_photo_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const [otherBrandMode, setOtherBrandMode] = useState(false)

  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [baluns, setBaluns] = useState<PowerBalun[]>([])
  const [switches, setSwitches] = useState<Switch[]>([])

  const isIP = connectionType === 'ip'
  const { models: cameraModels, saveModel } = useEquipmentModels('camera')
  
  // Extrai marcas únicas dos modelos cadastrados
  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    cameraModels.forEach((m) => { if (m.brand) brands.add(m.brand) })
    return Array.from(brands).sort().map((b) => ({ value: b, label: b }))
  }, [cameraModels])

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

  const handleModelSelect = (modelId: string) => {
    const m = cameraModels.find((x) => x.id === modelId)
    if (!m) return
    if (m.brand) setBrand(m.brand)
    if (m.resolution) setResolution(m.resolution)
    // Não preenche name - é o identificador da câmera específica
    // Não preenche model - é diferente do name da câmera
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      name,
      brand: brand || null,
      connection_type: connectionType,
      dvr_id: dvrId || null,
      channel_number: dvrId && channelNumber ? channelNumber : null,
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
      rtsp_url: streamUrl || null,
      streaming_user: streamUser || null,
      streaming_password: streamPass || null,
      qr_code_url: qrCodeUrl || null,
      installation_photo_url: installationPhotoUrl || null,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else if (brand) {
      // Salva no catálogo automaticamente
      await saveModel({ type: 'camera', brand, model: name, resolution, channel_count: null, poe_standard: null, max_ports: null, is_poe: false, notes: null })
    }
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

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPhoto(true)

    if (installationPhotoUrl && installationPhotoUrl !== initialData?.installation_photo_url) {
      await deleteInstallationPhoto(installationPhotoUrl)
    }

    const result = await uploadInstallationPhoto(file, user.id, initialData?.id)
    if (result.error) {
      setError('Erro ao fazer upload da foto: ' + result.error)
    } else if (result.url) {
      setInstallationPhotoUrl(result.url)
      setError(null)
    }
    setUploadingPhoto(false)
    e.target.value = ''
  }

  const handleRemovePhoto = async () => {
    if (installationPhotoUrl && installationPhotoUrl !== initialData?.installation_photo_url) {
      await deleteInstallationPhoto(installationPhotoUrl)
    }
    setInstallationPhotoUrl('')
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

      {/* Modelo do Catálogo */}
      {cameraModels.length > 0 && (
        <div className="bg-bg-tertiary/50 border border-border-light rounded-lg p-3">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5" />
            Modelo do Catálogo (opcional)
          </label>
          <Select
            value=""
            onChange={(e) => handleModelSelect(e.target.value)}
            options={[
              { value: '', label: 'Selecione um modelo para preencher automaticamente' },
              ...cameraModels.map((m) => ({ value: m.id, label: `${m.brand} ${m.model} ${m.resolution ? `(${m.resolution})` : ''}` })),
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Camera Hall Principal" />
        {brandOptions.length > 0 ? (
          <Select
            label="Marca"
            value={otherBrandMode ? '__other__' : brand}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__other__') {
                setOtherBrandMode(true)
                setBrand('')
              } else {
                setOtherBrandMode(false)
                setBrand(val)
              }
            }}
            options={[
              { value: '', label: 'Selecione ou digite uma marca' },
              ...brandOptions,
              { value: '__other__', label: 'Outra (digitar)' }
            ]}
          />
        ) : (
          <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Intelbras, Hikvision" />
        )}
      </div>
      {/* Campo para digitar nova marca quando selecionar "Outra" */}
      {otherBrandMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Digite a marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: Intelbras"
            autoFocus
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Estacionamento" />
      </div>

      {/* Analógica: DVR + Canal */}
      {!isIP && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="DVR (opcional)"
            value={dvrId}
            onChange={(e) => setDvrId(e.target.value)}
            options={dvrs.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Selecione o DVR"
          />
          <Select
            label="Canal"
            value={channelNumber}
            onChange={(e) => setChannelNumber(Number(e.target.value))}
            options={Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Canal ${i + 1}` }))}
          />
        </div>
      )}

      {/* IP: Endereço IP + MAC */}
      {isIP && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Endereço IP (opcional)"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.100"
            />
            <Input
              label="MAC Address (opcional)"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="DVR/NVR (opcional)"
              value={dvrId}
              onChange={(e) => setDvrId(e.target.value)}
              options={dvrs.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Nenhum"
            />
            <Select
              label="Canal"
              value={channelNumber}
              onChange={(e) => setChannelNumber(Number(e.target.value))}
              options={Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Canal ${i + 1}` }))}
              disabled={!dvrId}
            />
          </div>
        </>
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

      {/* Switch - apenas para câmeras IP */}
      {isIP && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Switch PoE (opcional)"
            value={switchId}
            onChange={(e) => setSwitchId(e.target.value)}
            options={(poeSwitches.length > 0 ? poeSwitches : switches).map((s) => ({
              value: s.id,
              label: `${s.name}${s.is_poe ? ' ⚡' : ''}`,
            }))}
            placeholder="Nenhum"
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
          />
        </div>
      )}

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

      {/* ── Visualização ao vivo ── */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5" />
          Visualização ao Vivo
        </label>

        <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setStreamMode('auto')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              streamMode === 'auto'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Auto (DVR)
          </button>
          <button
            type="button"
            onClick={() => setStreamMode('manual')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              streamMode === 'manual'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Manual
          </button>
        </div>

        {streamMode === 'auto' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="IP do DVR/NVR ou Câmera"
              value={ipAddress || ''}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.100"
              required={streamMode === 'auto'}
            />
            <Select
              label="Marca"
              value={brand || ''}
              onChange={(e) => setBrand(e.target.value)}
              options={[
                { value: '', label: 'Selecione a marca' },
                { value: 'Hikvision', label: 'Hikvision' },
                { value: 'Intelbras', label: 'Intelbras' },
                { value: 'Dahua', label: 'Dahua' },
              ]}
            />
            <Select
              label="Canal"
              value={channelNumber}
              onChange={(e) => setChannelNumber(Number(e.target.value))}
              options={Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Canal ${i + 1}` }))}
            />
          </div>
        ) : (
          <Input
            label="URL de Streaming (MJPEG, HLS ou Snapshot)"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="http://192.168.1.100/ISAPI/Streaming/channels/101/httpPreview"
          />
        )}

        {/* Credenciais de streaming */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Usuário do DVR"
            value={streamUser}
            onChange={(e) => setStreamUser(e.target.value)}
            placeholder="admin"
          />
          <Input
            label="Senha do DVR"
            type="password"
            value={streamPass}
            onChange={(e) => setStreamPass(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <p className="text-xs text-text-muted">
          {streamMode === 'auto'
            ? 'O sistema monta a URL automaticamente com base na marca e canal do DVR.'
            : 'Cole a URL direta de streaming (MJPEG, HLS ou snapshot) do seu dispositivo.'}
        </p>

        {/* Preview ao vivo */}
        <CameraPreview
          streamUrl={streamUrl}
          streamUser={streamUser}
          streamPass={streamPass}
          deviceIp={ipAddress}
          channelNumber={channelNumber}
          dvrBrand={brand}
          streamMode={streamMode}
        />
      </div>
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

      {/* ── Foto do local de instalação ── */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Foto do Local de Instalação
        </label>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoFileChange}
          className="hidden"
        />

        {installationPhotoUrl ? (
          <div className="relative w-fit group">
            <img
              src={installationPhotoUrl}
              alt="Foto do local de instalação"
              className="w-64 h-48 object-cover border border-border-light rounded-lg bg-bg-primary"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-1 right-1 px-2 py-1 bg-bg-tertiary/90 backdrop-blur-sm text-text-primary text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Substituir
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="w-full sm:w-auto flex items-center gap-2 px-4 py-8 border-2 border-dashed border-border-light rounded-lg text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            {uploadingPhoto ? (
              <span className="animate-pulse">Enviando...</span>
            ) : (
              <>
                <CameraIcon className="w-5 h-5" />
                <span>Tirar foto do local</span>
                <span className="text-xs opacity-60">(ou selecionar arquivo)</span>
              </>
            )}
          </button>
        )}

        <p className="text-xs text-text-muted">
          Registre uma foto de onde a câmera está instalada para conferência física futura.
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
