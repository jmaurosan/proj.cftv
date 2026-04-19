import { useState, useEffect, type FormEvent } from 'react'
import type { Camera, Dvr, PowerBalun, Switch } from '../../lib/types'
import { STATUS_OPTIONS, CAMERA_TYPES, RESOLUTION_OPTIONS, CONNECTION_TYPES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface CameraFormProps {
  initialData?: Camera | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function CameraForm({ initialData, onSubmit, onCancel }: CameraFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dvrs, setDvrs] = useState<Dvr[]>([])
  const [baluns, setBaluns] = useState<PowerBalun[]>([])
  const [switches, setSwitches] = useState<Switch[]>([])

  const isIP = connectionType === 'ip'

  useEffect(() => {
    supabase.from('dvrs').select('id, name').order('name').then(({ data }) => setDvrs((data as Dvr[]) || []))
    supabase.from('power_baluns').select('id, name').order('name').then(({ data }) => setBaluns((data as PowerBalun[]) || []))
    supabase.from('switches').select('id, name, is_poe').order('name').then(({ data }) => setSwitches((data as Switch[]) || []))
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
      notes: notes || null,
    })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  const poeSwitches = switches.filter((s) => s.is_poe)

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

      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Estacionamento" />
      </div>

      {/* Analógica: DVR + Canal */}
      {!isIP && (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="DVR"
            value={dvrId}
            onChange={(e) => setDvrId(e.target.value)}
            options={dvrs.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Selecione o DVR"
            required
          />
          <Input label="Canal" type="number" value={channelNumber} onChange={(e) => setChannelNumber(Number(e.target.value))} min={1} required />
        </div>
      )}

      {/* IP: Endereço IP + MAC */}
      {isIP && (
        <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-3 gap-4">
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} options={CAMERA_TYPES} />
        <Select label="Resolução" value={resolution} onChange={(e) => setResolution(e.target.value)} options={RESOLUTION_OPTIONS} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
      </div>

      {/* Balun - only for analog cameras */}
      {!isIP && (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Power Balun (opcional)"
            value={balunId}
            onChange={(e) => setBalunId(e.target.value)}
            options={baluns.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Nenhum"
          />
          <Input label="Porta do Balun" type="number" value={balunPort} onChange={(e) => setBalunPort(e.target.value)} min={1} />
        </div>
      )}

      {/* Switch - available for both, but especially important for IP */}
      <div className="grid grid-cols-2 gap-4">
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
        <Input label="Porta do Switch" type="number" value={switchPort} onChange={(e) => setSwitchPort(e.target.value)} min={1} required={isIP} />
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
