import { useState, useMemo, type FormEvent, useEffect } from 'react'
import type { Camera, CameraUpdate, Dvr } from '../../lib/types'
import { STATUS_OPTIONS, CHANNEL_OPTIONS, DVR_OPERATION_MODES } from '../../lib/constants'
import { findEquipmentModelByText } from '../../lib/equipmentModelCatalog'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { useCameras } from '../../hooks/useCameras'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import BackupManager from '../ui/BackupManager'
import PowerConsumptionFields from '../ui/PowerConsumptionFields'
import LabelScanner from '../ui/LabelScanner'
import { applyScannedLabel } from '../../lib/labelScanMerge'
import type { EquipmentLabelData } from '../../services/geminiService'
import { Cpu, HardDrive, Package } from 'lucide-react'

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

type ChannelCamera = Pick<Camera, 'id' | 'name' | 'status'>
type UpdateCamera = (id: string, payload: CameraUpdate) => Promise<{ error: string | null }>

function DvrChannelCameraItem({
  chNum,
  camera,
  updateCamera,
}: {
  chNum: number
  camera: ChannelCamera | undefined
  updateCamera: UpdateCamera
}) {
  const cameraName = camera?.name ?? ''
  const isActive = camera?.status === 'ativo'
  const [localName, setLocalName] = useState(cameraName)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalName(cameraName)
  }, [cameraName])

  const handleBlur = async () => {
    const nextName = localName.trim()
    if (!camera || nextName === cameraName) return
    if (!nextName) {
      setLocalName(cameraName)
      setSaveError('O nome da câmera não pode ficar vazio.')
      return
    }

    setSaving(true)
    setSaveError(null)
    const result = await updateCamera(camera.id, { name: nextName })
    setSaveError(result.error)
    setSaving(false)
  }

  const handleToggle = async (checked: boolean) => {
    if (!camera) return
    setSaving(true)
    setSaveError(null)
    const result = await updateCamera(camera.id, { status: checked ? 'ativo' : 'inativo' })
    setSaveError(result.error)
    setSaving(false)
  }

  const statusLabel = !camera
    ? 'Livre'
    : camera.status === 'ativo'
      ? 'Ativa'
      : camera.status === 'manutencao'
        ? 'Manutenção'
        : 'Inativa'

  return (
    <div className={`rounded-lg p-2 border transition-colors ${
      !camera
        ? 'bg-slate-900/40 border-dashed border-slate-700'
        : isActive
        ? 'bg-slate-800/50 border-transparent'
        : 'bg-rose-500/10 border-rose-500/50 shadow-sm shadow-rose-500/10'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-mono ${!camera || isActive ? 'text-slate-400' : 'text-rose-300 font-bold'}`}>
          CH {chNum}
        </span>
        <label className={`flex items-center gap-1 ml-auto ${camera ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={!camera || saving}
            className="w-3.5 h-3.5 rounded border-border accent-accent"
          />
          <span className={`text-xs ${camera && !isActive ? 'text-rose-300 font-semibold' : 'text-text-secondary'}`}>
            {statusLabel}
          </span>
        </label>
      </div>
      <input
        type="text"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        placeholder={camera ? 'Nome da câmera' : 'Canal livre'}
        aria-label={camera ? `Nome da câmera do canal ${chNum}` : `Canal ${chNum} livre`}
        disabled={!camera || saving}
        className={`w-full px-2 py-1 text-xs rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
          !camera
            ? 'bg-slate-900/30 border border-slate-700 cursor-not-allowed'
            : isActive
            ? 'bg-bg-tertiary border border-border focus:ring-primary/50' 
            : 'bg-danger/10 border border-danger/30 focus:ring-danger/50'
        }`}
      />
      {saving && <p className="mt-1 text-[10px] text-text-muted">Salvando...</p>}
      {saveError && <p className="mt-1 text-[10px] text-danger">{saveError}</p>}
    </div>
  )
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
  const [analogChannels, setAnalogChannels] = useState(initialData?.analog_channels ?? initialData?.total_channels ?? 8)
  const [ipChannels, setIpChannels] = useState(initialData?.ip_channels ?? 0)
  const [operationMode, setOperationMode] = useState<'hybrid' | 'nvr' | 'dvr_only'>(initialData?.operation_mode ?? 'hybrid')
  const [disabledAnalogChannels, setDisabledAnalogChannels] = useState<number[]>(initialData?.disabled_analog_channels ?? [])
  const [hdCapacityTb, setHdCapacityTb] = useState(initialData?.hd_capacity_tb?.toString() ?? '')
  const [hdBrand, setHdBrand] = useState(initialData?.hd_brand ?? '')
  const [hdModel, setHdModel] = useState(initialData?.hd_model ?? '')
  const [powerWatts, setPowerWatts] = useState(initialData?.power_watts?.toString() ?? '')
  const [operatingVoltage, setOperatingVoltage] = useState(initialData?.operating_voltage ?? '')
  const [currentConsumption, setCurrentConsumption] = useState(initialData?.current_consumption_a?.toString() ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherBrandMode, setOtherBrandMode] = useState(false)
  const { models: dvrModels, saveModel } = useEquipmentModels('dvr')
  const { data: cameras, update: updateCamera } = useCameras()
  const dvrId = initialData?.id ?? null

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
    if (m.channel_count) {
      // Catálogo guarda só o total; assume tudo analógico e usuário ajusta IP depois
      setAnalogChannels(m.channel_count)
      setIpChannels(0)
      setTotalChannels(m.channel_count)
    }
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
      total_channels: analogChannels + ipChannels,
      analog_channels: analogChannels,
      ip_channels: ipChannels,
      operation_mode: operationMode,
      disabled_analog_channels: disabledAnalogChannels.filter((n) => n >= 1 && n <= analogChannels).sort((a, b) => a - b),
      hd_capacity_tb: hdCapacityTb ? Number(hdCapacityTb) : null,
      hd_brand: hdBrand || null,
      hd_model: hdModel || null,
      power_watts: powerWatts ? Number(powerWatts) : null,
      operating_voltage: operatingVoltage || null,
      current_consumption_a: currentConsumption ? Number(currentConsumption) : null,
      status,
      username: username || null,
      password: password || null,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else {
      if (brand && model) {
        await saveModel({ type: 'dvr', brand, model, channel_count: totalChannels, resolution: null, poe_standard: null, max_ports: null, is_poe: false, notes: null })
      }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <LabelScanner
          equipmentType="dvr"
          onResult={(scanned: EquipmentLabelData) => {
            applyScannedLabel(scanned, [
              { key: 'brand', label: 'Marca', current: brand, setter: setBrand },
              { key: 'model', label: 'Modelo', current: model, setter: setModel },
              { key: 'serial_number', label: 'Nº de série', current: serialNumber, setter: setSerialNumber },
            ])
          }}
        />
      </div>
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
      <div className="border border-accent/30 rounded-lg p-4 space-y-3 bg-accent/5">
        <h3 className="text-sm font-semibold text-primary">Canais do DVR</h3>

        <Select
          label="Modo de operação"
          value={operationMode}
          onChange={(e) => {
            const next = e.target.value as 'hybrid' | 'nvr' | 'dvr_only'
            setOperationMode(next)
            if (next === 'nvr') { setAnalogChannels(0) }
            if (next === 'dvr_only') { setIpChannels(0) }
          }}
          options={DVR_OPERATION_MODES}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Canais BNC (analógicos)"
            type="number"
            min={0}
            max={64}
            value={analogChannels}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value) || 0)
              setAnalogChannels(v)
              setTotalChannels(v + ipChannels)
              // Poda canais desabilitados que caíram fora da nova faixa
              setDisabledAnalogChannels((current) => current.filter((n) => n <= v))
            }}
            disabled={operationMode === 'nvr'}
          />
          <Input
            label="Canais IP extras"
            type="number"
            min={0}
            max={64}
            value={ipChannels}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value) || 0)
              setIpChannels(v)
              setTotalChannels(analogChannels + v)
            }}
            disabled={operationMode === 'dvr_only'}
          />
        </div>

        <p className="text-xs text-text-muted">
          Total de canais: <strong>{analogChannels + ipChannels}</strong>
          {' · '}Analógicos ocupam <strong>Canal 1..{analogChannels || '—'}</strong>
          {ipChannels > 0 && <>, IPs extras ocupam <strong>Canal {analogChannels + 1}..{analogChannels + ipChannels}</strong></>}
        </p>

        {analogChannels > 0 && (
          <div className="border-t border-accent/20 pt-3 mt-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-text-primary">
                Converter canais BNC em IP (Enhanced IP Mode)
              </label>
              {disabledAnalogChannels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDisabledAnalogChannels([])}
                  className="text-[11px] text-accent hover:underline"
                >
                  Restaurar todos
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              Clique para converter um canal BNC específico em IP. Útil para DVRs Hikvision e Intelbras híbridos.
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {Array.from({ length: analogChannels }, (_, i) => i + 1).map((ch) => {
                const isDisabled = disabledAnalogChannels.includes(ch)
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setDisabledAnalogChannels((current) =>
                        current.includes(ch)
                          ? current.filter((n) => n !== ch)
                          : [...current, ch].sort((a, b) => a - b),
                      )
                    }}
                    className={`h-11 rounded-md text-xs font-mono border transition-colors ${
                      isDisabled
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    }`}
                    title={isDisabled ? `Canal ${ch} está como IP — clique para voltar a BNC` : `Canal ${ch} está como BNC — clique para converter em IP`}
                  >
                    <div className="font-bold">{ch}</div>
                    <div className="text-[9px] opacity-80">{isDisabled ? 'IP' : 'BNC'}</div>
                  </button>
                )
              })}
            </div>
            {disabledAnalogChannels.length > 0 && (
              <p className="text-[11px] text-cyan-300">
                <strong>{disabledAnalogChannels.length}</strong> canal(is) convertido(s) em IP: {disabledAnalogChannels.join(', ')}
                {' · '}Total efetivo: {analogChannels - disabledAnalogChannels.length} BNC + {ipChannels + disabledAnalogChannels.length} IP
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionais..." />

      {/* Seção de Canais do DVR */}
      {dvrId && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Câmeras por canal ({totalChannels})
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              O nome e o status são os mesmos do cadastro da câmera. Alterações feitas aqui também aparecem na tela de câmeras.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
            {Array.from({ length: totalChannels }, (_, i) => i + 1).map((chNum) => {
              const camera = cameras.find((item) => item.dvr_id === dvrId && item.channel_number === chNum)
              return (
                <DvrChannelCameraItem
                  key={chNum}
                  chNum={chNum}
                  camera={camera}
                  updateCamera={updateCamera}
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

      <PowerConsumptionFields powerWatts={powerWatts} operatingVoltage={operatingVoltage} currentConsumption={currentConsumption} onPowerWattsChange={setPowerWatts} onOperatingVoltageChange={setOperatingVoltage} onCurrentConsumptionChange={setCurrentConsumption} />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
