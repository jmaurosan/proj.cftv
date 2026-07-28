import { useState, useMemo, type FormEvent, useEffect, useRef } from 'react'
import type { Dvr } from '../../lib/types'
import { STATUS_OPTIONS, CHANNEL_OPTIONS } from '../../lib/constants'
import { findEquipmentModelByText } from '../../lib/equipmentModelCatalog'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { useDvrChannels } from '../../hooks/useDvrChannels'
import { useAuth } from '../../hooks/useAuth'
import {
  deleteQRCodeImage,
  getQRCodeImageUrl,
  uploadQRCodeImage,
} from '../../services/storageService'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import BackupManager from '../ui/BackupManager'
import { AlertTriangle, CameraIcon, Cloud, Cpu, HardDrive, Package, QrCode, Share2, X } from 'lucide-react'

const HD_CAPACITY_OPTIONS = [
  { value: '', label: 'Selecione a capacidade' },
  { value: '0.5', label: '500 GB' },
  { value: '1', label: '1 TB' },
  { value: '2', label: '2 TB' },
  { value: '3', label: '3 TB' },
  { value: '4', label: '4 TB' },
  { value: '6', label: '6 TB' },
  { value: '8', label: '8 TB' },
  { value: '10', label: '10 TB' },
  { value: '12', label: '12 TB' },
]

type SaveChannel = (channel: {
  channel_number: number
  is_active?: boolean
  notes?: string
}) => Promise<{ error: string | null }>

function DvrChannelItem({
  chNum,
  channel,
  saveChannel,
}: {
  chNum: number
  channel: { is_active?: boolean; notes?: string } | undefined
  saveChannel: SaveChannel
}) {
  const isActive = channel?.is_active ?? true;
  const dbNotes = channel?.notes ?? '';
  const [localNotes, setLocalNotes] = useState(dbNotes);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalNotes(dbNotes);
  }, [dbNotes]);

  const handleBlur = async () => {
    if (localNotes !== dbNotes) {
      setSaving(true);
      const result = await saveChannel({ channel_number: chNum, is_active: isActive, notes: localNotes });
      setSaveError(result.error);
      setSaving(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    const result = await saveChannel({ channel_number: chNum, is_active: checked, notes: localNotes });
    setSaveError(result.error);
    setSaving(false);
  };

  return (
    <div className={`rounded-lg p-2 border transition-colors ${
      isActive
        ? 'bg-slate-800/50 border-transparent'
        : 'bg-rose-500/10 border-rose-500/50 shadow-sm shadow-rose-500/10'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-mono ${isActive ? 'text-slate-400' : 'text-rose-300 font-bold'}`}>
          CH {chNum}
        </span>
        <label className="flex items-center gap-1 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border accent-accent"
          />
          <span className={`text-xs ${isActive ? 'text-text-secondary' : 'text-rose-300 font-semibold'}`}>
            {isActive ? 'OK' : 'Problema'}
          </span>
        </label>
      </div>
      {!isActive && (
        <div className="flex items-center gap-1 text-[10px] text-rose-300 mb-1">
          <AlertTriangle className="w-3 h-3" />
          Canal desabilitado
        </div>
      )}
      <input
        type="text"
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        placeholder={isActive ? "Observação do canal..." : "Motivo: câmera ruim, canal queimado..."}
        aria-label={`Observação do canal ${chNum}`}
        disabled={saving}
        className={`w-full px-2 py-1 text-xs rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
          isActive 
            ? 'bg-bg-tertiary border border-border focus:ring-primary/50' 
            : 'bg-danger/10 border border-danger/30 focus:ring-danger/50'
        }`}
      />
      {saving && <p className="mt-1 text-[10px] text-text-muted">Salvando...</p>}
      {saveError && <p className="mt-1 text-[10px] text-danger">{saveError}</p>}
    </div>
  );
}

interface DvrFormProps {
  initialData?: Dvr | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function DvrForm({ initialData, onSubmit, onCancel }: DvrFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number ?? '')
  const [installationDate, setInstallationDate] = useState(initialData?.installation_date ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [totalChannels, setTotalChannels] = useState(initialData?.total_channels ?? 8)
  const [hdCapacityTb, setHdCapacityTb] = useState(initialData?.hd_capacity_tb?.toString() ?? '')
  const [hdBrand, setHdBrand] = useState(initialData?.hd_brand ?? '')
  const [hdModel, setHdModel] = useState(initialData?.hd_model ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [hikConnectAccount, setHikConnectAccount] = useState(initialData?.hik_connect_account ?? '')
  const [hikConnectPassword, setHikConnectPassword] = useState(initialData?.hik_connect_password ?? '')
  const [hikConnectVerificationCode, setHikConnectVerificationCode] = useState(initialData?.hik_connect_verification_code ?? '')
  const [hikConnectSharingInfo, setHikConnectSharingInfo] = useState(initialData?.hik_connect_sharing_info ?? '')
  const [hikConnectQrCodeUrl, setHikConnectQrCodeUrl] = useState(initialData?.hik_connect_qr_code_url ?? '')
  const [hikConnectQrPreviewUrl, setHikConnectQrPreviewUrl] = useState<string | null>(null)
  const [uploadingHikConnectQr, setUploadingHikConnectQr] = useState(false)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherBrandMode, setOtherBrandMode] = useState(false)
  const hikConnectQrInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuth()
  const { models: dvrModels, saveModel } = useEquipmentModels('dvr')
  const dvrId = initialData?.id ?? null
  const { channels, saveChannel } = useDvrChannels(dvrId)

  useEffect(() => {
    let cancelled = false

    async function loadHikConnectQrPreview() {
      if (!hikConnectQrCodeUrl) {
        setHikConnectQrPreviewUrl(null)
        return
      }
      const signedUrl = await getQRCodeImageUrl(hikConnectQrCodeUrl)
      if (!cancelled) setHikConnectQrPreviewUrl(signedUrl)
    }

    loadHikConnectQrPreview()
    return () => {
      cancelled = true
    }
  }, [hikConnectQrCodeUrl])
  
  // Extrai marcas únicas dos modelos cadastrados
  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    dvrModels.forEach((m) => { if (m.brand) brands.add(m.brand) })
    return Array.from(brands).sort().map((b) => ({ value: b, label: b }))
  }, [dvrModels])

  const handleModelSelect = (modelId: string) => {
    const m = dvrModels.find((x) => x.id === modelId)
    if (!m) return
    setOtherBrandMode(false)
    if (m.brand) setBrand(m.brand)
    if (m.model) setModel(m.model)
    if (m.channel_count) setTotalChannels(m.channel_count)
    // Não preenche name - é o identificador do DVR específico
  }

  const handleModelTextChange = (nextModel: string) => {
    setModel(nextModel)
    const m = findEquipmentModelByText(dvrModels, nextModel, brand)
    if (!m?.id) return
    handleModelSelect(m.id)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      name,
      brand: brand || null,
      ip_address: ipAddress,
      model: model || null,
      serial_number: serialNumber || null,
      installation_date: installationDate || null,
      location,
      total_channels: totalChannels,
      hd_capacity_tb: hdCapacityTb ? Number(hdCapacityTb) : null,
      hd_brand: hdBrand || null,
      hd_model: hdModel || null,
      status,
      username: username || null,
      password: password || null,
      hik_connect_account: hikConnectAccount.trim() || null,
      hik_connect_password: hikConnectPassword || null,
      hik_connect_verification_code: hikConnectVerificationCode.trim() || null,
      hik_connect_sharing_info: hikConnectSharingInfo.trim() || null,
      hik_connect_qr_code_url: hikConnectQrCodeUrl || null,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else {
      if (initialData?.hik_connect_qr_code_url && hikConnectQrCodeUrl !== initialData.hik_connect_qr_code_url) {
        await deleteQRCodeImage(initialData.hik_connect_qr_code_url)
      }
      if (brand && model) {
        await saveModel({ type: 'dvr', brand, model, channel_count: totalChannels, resolution: null, poe_standard: null, max_ports: null, is_poe: false, notes: null })
      }
    }
    setLoading(false)
  }

  const handleHikConnectQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingHikConnectQr(true)
    setError(null)

    if (hikConnectQrCodeUrl && hikConnectQrCodeUrl !== initialData?.hik_connect_qr_code_url) {
      await deleteQRCodeImage(hikConnectQrCodeUrl)
    }

    const result = await uploadQRCodeImage(file, user.id, initialData?.id)
    if (result.error) {
      setError(`Erro ao enviar o QR Code do Hik-Connect: ${result.error}`)
    } else if (result.url) {
      setHikConnectQrCodeUrl(result.url)
    }
    setUploadingHikConnectQr(false)
    e.target.value = ''
  }

  const handleRemoveHikConnectQr = async () => {
    if (hikConnectQrCodeUrl && hikConnectQrCodeUrl !== initialData?.hik_connect_qr_code_url) {
      await deleteQRCodeImage(hikConnectQrCodeUrl)
    }
    setHikConnectQrCodeUrl('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}
      {/* Modelo do Catálogo */}
      {dvrModels.length > 0 && (
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
              ...dvrModels.map((m) => ({ value: m.id, label: `${m.brand} ${m.model} ${m.channel_count ? `(${m.channel_count} canais)` : ''}` })),
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: DVR Portaria" />
        <Input label="Endereço IP" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} required placeholder="192.168.1.100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Intelbras" />
        )}
        <Input label="Modelo" value={model} onChange={(e) => handleModelTextChange(e.target.value)} placeholder="Ex: MHDX 3116" list="dvr-models" />
        <datalist id="dvr-models">
          {dvrModels.map((item) => <option key={item.id} value={item.model} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="SN / Número de série" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Número de série do equipamento" />
        <Input label="Data de instalação" type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
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
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Sala de TI" />
      </div>
      <div className="border border-border-light rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          HD Instalado
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Capacidade"
            value={hdCapacityTb}
            onChange={(e) => setHdCapacityTb(e.target.value)}
            options={HD_CAPACITY_OPTIONS}
            required
          />
          <Input
            label="Marca do HD"
            value={hdBrand}
            onChange={(e) => setHdBrand(e.target.value)}
            required
            placeholder="Ex: Seagate"
          />
          <Input
            label="Modelo do HD"
            value={hdModel}
            onChange={(e) => setHdModel(e.target.value)}
            required
            placeholder="Ex: SkyHawk ST2000VX"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Total de Canais"
          value={totalChannels}
          onChange={(e) => setTotalChannels(Number(e.target.value))}
          options={CHANNEL_OPTIONS.map((c) => ({ value: c, label: `${c} canais` }))}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Usuário de Acesso" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
        <Input label="Senha de Acesso" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div className="border border-border-light rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Acesso Hik-Connect
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Dados da conta em nuvem, compartilhamento e verificação deste DVR.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Conta Hik-Connect"
            value={hikConnectAccount}
            onChange={(e) => setHikConnectAccount(e.target.value)}
            placeholder="E-mail, telefone ou usuário"
            autoComplete="off"
          />
          <Input
            label="Senha do Hik-Connect"
            type="password"
            value={hikConnectPassword}
            onChange={(e) => setHikConnectPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <Input
          label="Código de verificação do dispositivo"
          type="password"
          value={hikConnectVerificationCode}
          onChange={(e) => setHikConnectVerificationCode(e.target.value)}
          placeholder="Código usado para adicionar ou validar o DVR"
          autoComplete="off"
        />

        <div>
          <label className="text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            Informações de compartilhamento
          </label>
          <textarea
            value={hikConnectSharingInfo}
            onChange={(e) => setHikConnectSharingInfo(e.target.value)}
            rows={3}
            placeholder="Ex: compartilhado com portaria@..., responsável, permissões e observações."
            className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-sm resize-y"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
            <QrCode className="w-4 h-4" />
            Foto do QR Code do DVR
          </label>
          <input
            ref={hikConnectQrInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleHikConnectQrFileChange}
            className="hidden"
          />

          {hikConnectQrCodeUrl ? (
            <div className="relative w-fit group">
              {hikConnectQrPreviewUrl ? (
                <img
                  src={hikConnectQrPreviewUrl}
                  alt="QR Code do Hik-Connect do DVR"
                  className="w-48 h-48 object-contain border border-border-light rounded-lg bg-bg-primary"
                />
              ) : (
                <div className="w-48 h-48 border border-border-light rounded-lg bg-bg-primary flex items-center justify-center text-xs text-text-muted">
                  Preparando QR Code...
                </div>
              )}
              <button
                type="button"
                onClick={handleRemoveHikConnectQr}
                className="absolute -top-2 -right-2 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Remover foto"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => hikConnectQrInputRef.current?.click()}
                className="absolute bottom-1 right-1 px-2 py-1 bg-bg-tertiary/90 backdrop-blur-sm text-text-primary text-xs rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                Substituir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => hikConnectQrInputRef.current?.click()}
              disabled={uploadingHikConnectQr || !user}
              className="w-full sm:w-auto flex items-center gap-2 px-4 py-8 border-2 border-dashed border-border-light rounded-lg text-text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              {uploadingHikConnectQr ? (
                <span className="animate-pulse">Compactando e enviando...</span>
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
            A imagem fica armazenada de forma privada e é aberta por um link temporário.
          </p>
        </div>
      </div>

      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionais..." />

      {/* Seção de Canais do DVR */}
      {dvrId && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Canais do DVR ({totalChannels})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
            {Array.from({ length: totalChannels }, (_, i) => i + 1).map((chNum) => {
              const channel = channels.find((c) => c.channel_number === chNum)
              return (
                <DvrChannelItem
                  key={chNum}
                  chNum={chNum}
                  channel={channel}
                  saveChannel={saveChannel}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Backups de Configuração */}
      {dvrId && (
        <BackupManager
          clientId={initialData?.client_id ?? null}
          equipmentType="dvr"
          equipmentId={dvrId}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
