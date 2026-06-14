import { useState, useMemo, type FormEvent, useEffect } from 'react'
import type { Dvr } from '../../lib/types'
import { STATUS_OPTIONS, CHANNEL_OPTIONS } from '../../lib/constants'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { useDvrChannels } from '../../hooks/useDvrChannels'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import BackupManager from '../ui/BackupManager'
import { AlertTriangle, HardDrive, Package, Cpu } from 'lucide-react'

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

function DvrChannelItem({ chNum, channel, saveChannel }: { chNum: number; channel: any; saveChannel: any }) {
  const isActive = channel?.is_active ?? true;
  const dbNotes = channel?.notes ?? '';
  const [localNotes, setLocalNotes] = useState(dbNotes);

  useEffect(() => {
    setLocalNotes(dbNotes);
  }, [dbNotes]);

  const handleBlur = () => {
    if (localNotes !== dbNotes) {
      saveChannel({ channel_number: chNum, is_active: isActive, notes: localNotes });
    }
  };

  const handleToggle = (checked: boolean) => {
    saveChannel({ channel_number: chNum, is_active: checked, notes: localNotes });
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
        placeholder={isActive ? "Notas..." : "Motivo: câmera ruim, canal queimado..."}
        className={`w-full px-2 py-1 text-xs rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 ${
          isActive 
            ? 'bg-bg-tertiary border border-border focus:ring-primary/50' 
            : 'bg-danger/10 border border-danger/30 focus:ring-danger/50'
        }`}
      />
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
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [totalChannels, setTotalChannels] = useState(initialData?.total_channels ?? 8)
  const [hdCapacityTb, setHdCapacityTb] = useState(initialData?.hd_capacity_tb?.toString() ?? '')
  const [hdBrand, setHdBrand] = useState(initialData?.hd_brand ?? '')
  const [hdModel, setHdModel] = useState(initialData?.hd_model ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherBrandMode, setOtherBrandMode] = useState(false)

  const { models: dvrModels, saveModel } = useEquipmentModels('dvr')
  const dvrId = initialData?.id ?? null
  const { channels, saveChannel } = useDvrChannels(dvrId)
  
  // Extrai marcas únicas dos modelos cadastrados
  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    dvrModels.forEach((m) => { if (m.brand) brands.add(m.brand) })
    return Array.from(brands).sort().map((b) => ({ value: b, label: b }))
  }, [dvrModels])

  const handleModelSelect = (modelId: string) => {
    const m = dvrModels.find((x) => x.id === modelId)
    if (!m) return
    if (m.brand) setBrand(m.brand)
    if (m.model) setModel(m.model)
    if (m.channel_count) setTotalChannels(m.channel_count)
    // Não preenche name - é o identificador do DVR específico
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
      location,
      total_channels: totalChannels,
      hd_capacity_tb: hdCapacityTb ? Number(hdCapacityTb) : null,
      hd_brand: hdBrand || null,
      hd_model: hdModel || null,
      status,
      username: username || null,
      password: password || null,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else if (brand) {
      await saveModel({ type: 'dvr', brand, model: name || model, channel_count: totalChannels, resolution: null, poe_standard: null, max_ports: null, is_poe: false, notes: null })
    }
    setLoading(false)
  }

  const handleChannelActiveToggle = async (channelNumber: number, isActive: boolean) => {
    if (!dvrId) return
    await saveChannel({ channel_number: channelNumber, is_active: isActive, notes: channels.find(c => c.channel_number === channelNumber)?.notes || undefined })
  }

  const handleChannelNotesSave = async (channelNumber: number, notes: string) => {
    if (!dvrId) return
    await saveChannel({ channel_number: channelNumber, is_active: channels.find(c => c.channel_number === channelNumber)?.is_active ?? true, notes })
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
        <Input label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: MHDX 3116" />
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
