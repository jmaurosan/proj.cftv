import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CameraIcon, Eye, EyeOff, QrCode, Share2, X } from 'lucide-react'
import type { Camera, Credential, Dvr } from '../../lib/types'
import { DEVICE_TYPES, PROTOCOL_OPTIONS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useClient } from '../../contexts/ClientContext'
import { deleteQRCodeImage, getQRCodeImageUrl, uploadQRCodeImage } from '../../services/storageService'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface CredentialFormProps {
  initialData?: Credential | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

type LinkedEquipment = {
  id: string
  name: string
  serial_number: string | null
  ip_address: string | null
  deviceType: 'dvr' | 'camera'
}

export default function CredentialForm({ initialData, onSubmit, onCancel }: CredentialFormProps) {
  const [label, setLabel] = useState(initialData?.label ?? '')
  const [deviceType, setDeviceType] = useState(initialData?.device_type ?? 'dvr')
  const [deviceId, setDeviceId] = useState(initialData?.device_id ?? '')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [port, setPort] = useState<string>(initialData?.port?.toString() ?? '')
  const [protocol, setProtocol] = useState(initialData?.protocol ?? 'http')
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number ?? '')
  const [verificationCode, setVerificationCode] = useState(initialData?.verification_code ?? '')
  const [sharingInfo, setSharingInfo] = useState(initialData?.sharing_info ?? '')
  const [qrCodeUrl, setQrCodeUrl] = useState(initialData?.qr_code_url ?? '')
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [showVerificationCode, setShowVerificationCode] = useState(false)
  const [equipment, setEquipment] = useState<LinkedEquipment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const isHikConnect = protocol === 'hik_connect'

  useEffect(() => {
    let cancelled = false
    if (!selectedClientId) {
      setEquipment([])
      return
    }

    Promise.all([
      supabase.from('dvrs').select('id, name, serial_number, ip_address').eq('client_id', selectedClientId).order('name'),
      supabase.from('cameras').select('id, name, serial_number, ip_address').eq('client_id', selectedClientId).in('connection_type', ['ip', 'wifi']).order('name'),
    ]).then(([dvrResult, cameraResult]) => {
      if (cancelled) return
      if (dvrResult.error || cameraResult.error) {
        setError('Não foi possível carregar os DVRs e câmeras deste cliente.')
        return
      }
      const dvrs = ((dvrResult.data ?? []) as Array<Pick<Dvr, 'id' | 'name' | 'serial_number' | 'ip_address'>>)
        .map((item) => ({ ...item, deviceType: 'dvr' as const }))
      const cameras = ((cameraResult.data ?? []) as Array<Pick<Camera, 'id' | 'name' | 'serial_number' | 'ip_address'>>)
        .map((item) => ({ ...item, deviceType: 'camera' as const }))
      setEquipment([...dvrs, ...cameras])
    })
    return () => { cancelled = true }
  }, [selectedClientId])

  useEffect(() => {
    let cancelled = false
    if (!qrCodeUrl) {
      setQrPreviewUrl(null)
      return
    }
    getQRCodeImageUrl(qrCodeUrl).then((url) => {
      if (!cancelled) setQrPreviewUrl(url)
    })
    return () => { cancelled = true }
  }, [qrCodeUrl])

  const equipmentOptions = useMemo(
    () => equipment
      .filter((item) => item.deviceType === deviceType)
      .map((item) => ({
        value: item.id,
        label: `${item.name}${item.serial_number ? ` · SN ${item.serial_number}` : ''}${item.ip_address ? ` · ${item.ip_address}` : ''}`,
      })),
    [deviceType, equipment],
  )

  const handleDeviceTypeChange = (nextType: string) => {
    setDeviceType(nextType)
    setDeviceId('')
  }

  const handleEquipmentSelect = (nextDeviceId: string) => {
    setDeviceId(nextDeviceId)
    const selected = equipment.find((item) => item.id === nextDeviceId && item.deviceType === deviceType)
    if (!selected) return
    if (!label.trim()) setLabel(`${isHikConnect ? 'Hik-Connect' : 'Acesso'} - ${selected.name}`)
    setSerialNumber(selected.serial_number ?? '')
    setIpAddress(selected.ip_address ?? '')
    if (isHikConnect && !port) setPort('8000')
  }

  const handleProtocolChange = (nextProtocol: string) => {
    setProtocol(nextProtocol)
    if (nextProtocol === 'hik_connect' && !port) setPort('8000')
  }

  const handleQrFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setUploadingQr(true)
    setError(null)

    if (qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) await deleteQRCodeImage(qrCodeUrl)
    const result = await uploadQRCodeImage(file, user.id, deviceId || initialData?.id)
    if (result.error) setError(`Erro ao enviar o QR Code do Hik-Connect: ${result.error}`)
    else if (result.url) setQrCodeUrl(result.url)

    setUploadingQr(false)
    event.target.value = ''
  }

  const handleRemoveQr = async () => {
    if (qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) await deleteQRCodeImage(qrCodeUrl)
    setQrCodeUrl('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const submittedQrCodeUrl = isHikConnect ? qrCodeUrl || null : null
    const result = await onSubmit({
      label,
      device_type: deviceType,
      device_id: deviceId || null,
      username,
      password,
      ip_address: ipAddress || null,
      port: port ? Number(port) : null,
      protocol,
      serial_number: serialNumber || null,
      verification_code: isHikConnect ? verificationCode.trim() || null : null,
      sharing_info: isHikConnect ? sharingInfo.trim() || null : null,
      qr_code_url: submittedQrCodeUrl,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else {
      if (initialData?.qr_code_url && submittedQrCodeUrl !== initialData.qr_code_url) {
        await deleteQRCodeImage(initialData.qr_code_url)
      }
      if (!isHikConnect && qrCodeUrl && qrCodeUrl !== initialData?.qr_code_url) {
        await deleteQRCodeImage(qrCodeUrl)
      }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Rótulo" value={label} onChange={(event) => setLabel(event.target.value)} required placeholder="Ex: Hik-Connect - DVR Principal" />
        <Select label="Tipo de acesso" value={protocol} onChange={(event) => handleProtocolChange(event.target.value)} options={PROTOCOL_OPTIONS} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Tipo de dispositivo" value={deviceType} onChange={(event) => handleDeviceTypeChange(event.target.value)} options={DEVICE_TYPES} />
        {(deviceType === 'dvr' || deviceType === 'camera') && (
          <Select label={deviceType === 'dvr' ? 'DVR vinculado' : 'Câmera IP vinculada'} value={deviceId} onChange={(event) => handleEquipmentSelect(event.target.value)} options={equipmentOptions} placeholder="Preenchimento manual / sem vínculo" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={isHikConnect ? 'Conta Hik-Connect' : 'Usuário'} value={username} onChange={(event) => setUsername(event.target.value)} required={!isHikConnect} placeholder={isHikConnect ? 'E-mail, telefone ou usuário (opcional)' : 'admin'} />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{isHikConnect ? 'Senha do Hik-Connect' : 'Senha'}</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required={!isHikConnect} autoComplete="new-password" className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm pr-10" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_180px] gap-4">
        <Input label="Endereço IP" value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} placeholder="192.168.1.100" />
        <Input label="Porta" type="number" value={port} onChange={(event) => setPort(event.target.value)} placeholder={isHikConnect ? '8000' : '80'} />
        <Input label="Número de série" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="SN do dispositivo" />
      </div>

      {isHikConnect && (
        <div className="border border-border-light rounded-lg p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-primary">Acesso Hik-Connect</h3>
            <p className="mt-1 text-xs text-text-muted">Vincule o DVR ou a câmera IP, ou preencha os dados manualmente.</p>
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Código de verificação</label>
            <div className="relative">
              <input type={showVerificationCode ? 'text' : 'password'} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="Código do dispositivo" autoComplete="off" className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm pr-10" />
              <button type="button" onClick={() => setShowVerificationCode((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary" aria-label={showVerificationCode ? 'Ocultar código' : 'Mostrar código'}>
                {showVerificationCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" /> Informações de compartilhamento</label>
            <textarea value={sharingInfo} onChange={(event) => setSharingInfo(event.target.value)} rows={3} placeholder="Responsáveis, permissões e observações." className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm resize-y" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5"><QrCode className="w-4 h-4" /> Foto do QR Code</label>
            <input ref={qrInputRef} type="file" accept="image/*" capture="environment" onChange={handleQrFileChange} className="hidden" />
            {qrCodeUrl ? (
              <div className="relative w-fit group">
                {qrPreviewUrl ? <img src={qrPreviewUrl} alt="QR Code do Hik-Connect" className="w-40 h-40 object-contain border border-border-light rounded-lg bg-bg-primary" /> : <div className="w-40 h-40 border border-border-light rounded-lg bg-bg-primary flex items-center justify-center text-xs text-text-muted">Preparando QR Code...</div>}
                <button type="button" onClick={handleRemoveQr} className="absolute -top-2 -right-2 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-md" title="Remover foto"><X className="w-4 h-4" /></button>
                <button type="button" onClick={() => qrInputRef.current?.click()} className="absolute bottom-1 right-1 px-2 py-1 bg-bg-tertiary/90 text-text-primary text-xs rounded-md">Substituir</button>
              </div>
            ) : (
              <button type="button" onClick={() => qrInputRef.current?.click()} disabled={uploadingQr || !user} className="w-full sm:w-auto flex items-center gap-2 px-4 py-6 border-2 border-dashed border-border-light rounded-lg text-text-muted hover:border-accent hover:text-accent disabled:opacity-50">
                {uploadingQr ? <span className="animate-pulse">Enviando...</span> : <><CameraIcon className="w-5 h-5" /><span>Tirar foto do QR Code</span></>}
              </button>
            )}
            <p className="text-xs text-text-muted">A imagem permanece privada e é aberta por link temporário.</p>
          </div>
        </div>
      )}

      <Input label="Observações" value={notes} onChange={(event) => setNotes(event.target.value)} />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  )
}
