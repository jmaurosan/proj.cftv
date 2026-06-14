import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import Select from '../ui/Select'

const DEVICE_TYPE_LABELS: Record<string, string> = {
  dvr: 'DVR',
  camera: 'Câmera IP',
  router: 'Roteador',
}

interface SwitchPortItemProps {
  portNum: number
  port: any
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

  useEffect(() => {
    setLocalNotes(dbNotes)
  }, [dbNotes])

  const handleNotesBlur = () => {
    if (localNotes !== dbNotes) {
      savePort({ 
        port_number: portNum, 
        device_type: deviceType || null, 
        device_id: deviceId || null,
        device_name: deviceName || null, 
        is_active: isActive, 
        notes: localNotes || undefined
      })
    }
  }

  const handleToggle = (checked: boolean) => {
    savePort({ 
      port_number: portNum, 
      device_type: deviceType || null, 
      device_id: deviceId || null,
      device_name: deviceName || null, 
      is_active: checked, 
      notes: localNotes || undefined
    })
  }

  const handleDeviceSelect = (selectedValue: string) => {
    if (!selectedValue) {
      savePort({
        port_number: portNum,
        device_type: null,
        device_id: null,
        device_name: null,
        is_active: isActive,
        notes: localNotes || undefined
      })
      return
    }

    const [newDeviceType, newDeviceId] = selectedValue.split(':')
    const selectedDevice = availableDevices.find((device) => device.type === newDeviceType && device.id === newDeviceId)
    const selectedName = selectedDevice?.name ?? ''
    savePort({
      port_number: portNum,
      device_type: newDeviceType || null,
      device_id: newDeviceId || null,
      device_name: selectedName || null,
      is_active: isActive,
      notes: localNotes || undefined
    })
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
          value={selectedDeviceValue}
          onChange={(e) => handleDeviceSelect(e.target.value)}
          options={[
            { value: '', label: 'Desconectado' },
            ...availableDevices.map((device) => ({ value: device.value, label: device.label })),
          ]}
          disabled={!isActive}
        />
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
