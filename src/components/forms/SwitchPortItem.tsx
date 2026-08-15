import { useState, useEffect } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'

const DEVICE_TYPE_LABELS: Record<string, string> = {
  dvr: 'DVR',
  camera: 'Câmera IP',
  router: 'Roteador',
}

interface PortRecord {
  is_active?: boolean
  device_type?: string | null
  device_id?: string | null
  device_name?: string | null
  notes?: string | null
}

interface SwitchPortItemProps {
  portNum: number
  port: PortRecord | null
  deviceOptions: Record<string, { id: string; name: string }[]>
  savePort: (port: {
    port_number: number
    device_type?: string | null
    device_id?: string | null
    device_name?: string | null
    is_active?: boolean
    notes?: string
  }) => Promise<{ error: string | null } | { error: null }>
}

export default function SwitchPortItem({ portNum, port, deviceOptions, savePort }: SwitchPortItemProps) {
  const isActive = port?.is_active ?? true
  const deviceType = port?.device_type ?? ''
  const deviceId = port?.device_id ?? ''
  const deviceName = port?.device_name ?? ''
  const dbNotes = port?.notes ?? ''
  const availableDevices = ['dvr', 'camera', 'router'].flatMap((type) =>
    (deviceOptions[type] ?? []).map((device) => ({
      ...device,
      type,
      value: `${type}:${device.id}`,
      label: `${DEVICE_TYPE_LABELS[type]} - ${device.name}`,
    }))
  )
  const selectedDeviceValue = deviceType && deviceId ? `${deviceType}:${deviceId}` : ''
  
  const [localNotes, setLocalNotes] = useState(dbNotes)
  const [localDeviceValue, setLocalDeviceValue] = useState(selectedDeviceValue)
  const [localDeviceName, setLocalDeviceName] = useState(deviceName)
  const [editingName, setEditingName] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setLocalNotes(dbNotes)
  }, [dbNotes])

  useEffect(() => {
    setLocalDeviceValue(selectedDeviceValue)
  }, [selectedDeviceValue])

  useEffect(() => {
    setLocalDeviceName(deviceName)
  }, [deviceName])

  const handleNotesBlur = async () => {
    if (localNotes !== dbNotes) {
      setSaveError(null)
      const result = await savePort({
        port_number: portNum, 
        device_type: deviceType || null, 
        device_id: deviceId || null,
        device_name: localDeviceName || deviceName || null, 
        is_active: isActive, 
        notes: localNotes || undefined
      })
      if (result.error) setSaveError(result.error)
    }
  }

  const handleToggle = async (checked: boolean) => {
    setSaveError(null)
    const result = await savePort({
      port_number: portNum, 
      device_type: deviceType || null, 
      device_id: deviceId || null,
      device_name: localDeviceName || deviceName || null, 
      is_active: checked, 
      notes: localNotes || undefined
    })
    if (result.error) setSaveError(result.error)
  }

  const handleDeviceSelect = async (selectedValue: string) => {
    setLocalDeviceValue(selectedValue)
    setSaving(true)
    setSaveError(null)

    if (!selectedValue) {
      const result = await savePort({
        port_number: portNum,
        device_type: null,
        device_id: null,
        device_name: localDeviceName || null,
        is_active: isActive,
        notes: localNotes || undefined
      })
      if (result.error) {
        setSaveError(result.error)
        setLocalDeviceValue(selectedDeviceValue)
      }
      setSaving(false)
      return
    }

    const [newDeviceType, newDeviceId] = selectedValue.split(':')
    const selectedDevice = availableDevices.find((device) => device.type === newDeviceType && device.id === newDeviceId)
    const selectedName = selectedDevice?.name ?? ''
    setLocalDeviceName(selectedName)
    const result = await savePort({
      port_number: portNum,
      device_type: newDeviceType || null,
      device_id: newDeviceId || null,
      device_name: selectedName || null,
      is_active: isActive,
      notes: localNotes || undefined
    })
    if (result.error) {
      setSaveError(result.error)
      setLocalDeviceValue(selectedDeviceValue)
    }
    setSaving(false)
  }

  const handleSaveDisplayName = async () => {
    setSaving(true)
    setSaveError(null)
    const result = await savePort({
      port_number: portNum,
      device_type: deviceType || null,
      device_id: deviceId || null,
      device_name: localDeviceName.trim() || null,
      is_active: isActive,
      notes: localNotes || undefined
    })
    if (result.error) {
      setSaveError(result.error)
    } else {
      setEditingName(false)
    }
    setSaving(false)
  }

  const handleCancelDisplayName = () => {
    setLocalDeviceName(deviceName)
    setEditingName(false)
    setSaveError(null)
  }

  return (
    <div className={`flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 flex-wrap ${!isActive ? 'opacity-50' : ''}`}>
      <span className="text-xs font-mono text-slate-400 w-16 shrink-0 font-bold">Porta {portNum}</span>
      
      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-accent"
        />
        <span className="text-xs text-text-secondary">Ativa</span>
      </label>

      <div className="flex-1 min-w-[120px]">
        <Select
          value={localDeviceValue}
          onChange={(e) => handleDeviceSelect(e.target.value)}
          options={[
            { value: '', label: 'Desconectado' },
            ...availableDevices.map((device) => ({ value: device.value, label: device.label })),
          ]}
          disabled={!isActive || saving}
        />
        {saveError && (
          <p className="mt-1 text-xs text-danger">{saveError}</p>
        )}
      </div>

      <div className="flex-1 min-w-[220px]">
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome exibido na porta"
              value={localDeviceName}
              onChange={(e) => setLocalDeviceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSaveDisplayName()
                }
                if (e.key === 'Escape') handleCancelDisplayName()
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveDisplayName}
              disabled={saving}
              className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
              title="Salvar nome exibido"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCancelDisplayName}
              disabled={saving}
              className="p-2 rounded-lg bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
              title="Cancelar edição"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border-light bg-bg-primary/50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Nome exibido</p>
              <p className="truncate text-xs font-medium text-text-primary">
                {localDeviceName || 'Sem rótulo'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
              title="Editar nome exibido"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {!isActive && (
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Motivo da desativação (opcional)..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
