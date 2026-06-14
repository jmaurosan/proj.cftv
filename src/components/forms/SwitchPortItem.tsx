import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import Select from '../ui/Select'

const DEVICE_TYPES = [
  { value: '', label: 'Desconectado' },
  { value: 'camera', label: 'Câmera' },
  { value: 'dvr', label: 'DVR' },
  { value: 'balun', label: 'Power Balun' },
  { value: 'switch', label: 'Switch' },
  { value: 'router', label: 'Roteador' },
  { value: 'other', label: 'Outro' },
]

interface SwitchPortItemProps {
  portNum: number
  port: any
  savePort: (port: {
    port_number: number
    device_type?: string | null
    device_name?: string | null
    is_active?: boolean
    notes?: string
  }) => Promise<{ error: string | null } | { error: null }>
}

export default function SwitchPortItem({ portNum, port, savePort }: SwitchPortItemProps) {
  const isActive = port?.is_active ?? true
  const deviceType = port?.device_type ?? ''
  const deviceName = port?.device_name ?? ''
  const dbNotes = port?.notes ?? ''
  
  const [localDeviceName, setLocalDeviceName] = useState(deviceName)
  const [localNotes, setLocalNotes] = useState(dbNotes)

  useEffect(() => {
    setLocalDeviceName(deviceName)
  }, [deviceName])

  useEffect(() => {
    setLocalNotes(dbNotes)
  }, [dbNotes])

  const handleDeviceNameBlur = () => {
    if (localDeviceName !== deviceName) {
      savePort({ 
        port_number: portNum, 
        device_type: deviceType || null, 
        device_name: localDeviceName || null, 
        is_active: isActive,
        notes: dbNotes || undefined
      })
    }
  }

  const handleNotesBlur = () => {
    if (localNotes !== dbNotes) {
      savePort({ 
        port_number: portNum, 
        device_type: deviceType || null, 
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
      device_name: deviceName || null, 
      is_active: checked, 
      notes: localNotes || undefined
    })
  }

  const handleDeviceTypeChange = (newType: string) => {
    savePort({
      port_number: portNum,
      device_type: newType || null,
      device_name: newType ? localDeviceName : null,
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
          value={deviceType}
          onChange={(e) => handleDeviceTypeChange(e.target.value)}
          options={DEVICE_TYPES}
          disabled={!isActive}
        />
      </div>

      {deviceType && (
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Nome do dispositivo"
            value={localDeviceName}
            onChange={(e) => setLocalDeviceName(e.target.value)}
            onBlur={handleDeviceNameBlur}
            disabled={!isActive}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
          />
        </div>
      )}

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
