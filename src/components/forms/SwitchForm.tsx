import { useState, useMemo, type FormEvent, useEffect } from 'react'
import type { Switch } from '../../lib/types'
import { STATUS_OPTIONS, POE_STANDARDS } from '../../lib/constants'
import { useSwitchPorts } from '../../hooks/useSwitchPorts'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import BackupManager from '../ui/BackupManager'
import { Plug, Package } from 'lucide-react'

const DEVICE_TYPES = [
  { value: '', label: 'Desconectado' },
  { value: 'camera', label: 'Câmera' },
  { value: 'dvr', label: 'DVR' },
  { value: 'balun', label: 'Power Balun' },
  { value: 'switch', label: 'Switch' },
  { value: 'router', label: 'Roteador' },
  { value: 'other', label: 'Outro' },
]

function SwitchPortItem({ portNum, port, savePort }: { portNum: number; port: any; savePort: any }) {
  const isActive = port?.is_active ?? true;
  const deviceType = port?.device_type ?? '';
  const deviceName = port?.device_name ?? '';
  const dbNotes = port?.notes ?? '';
  
  const [localDeviceName, setLocalDeviceName] = useState(deviceName);
  const [localNotes, setLocalNotes] = useState(dbNotes);

  useEffect(() => {
    setLocalDeviceName(deviceName);
  }, [deviceName]);

  useEffect(() => {
    setLocalNotes(dbNotes);
  }, [dbNotes]);

  const handleDeviceNameBlur = () => {
    if (localDeviceName !== deviceName) {
      savePort({ 
        port_number: portNum, 
        device_type: deviceType, 
        device_name: localDeviceName, 
        is_active: isActive,
        notes: dbNotes 
      });
    }
  };

  const handleNotesBlur = () => {
    if (localNotes !== dbNotes) {
      savePort({ 
        port_number: portNum, 
        device_type: deviceType, 
        device_name: deviceName, 
        is_active: isActive, 
        notes: localNotes 
      });
    }
  };

  const handleToggle = (checked: boolean) => {
    savePort({ 
      port_number: portNum, 
      device_type: deviceType, 
      device_name: deviceName, 
      is_active: checked, 
      notes: localNotes 
    });
  };

  const handleDeviceTypeChange = (newType: string) => {
    savePort({
      port_number: portNum,
      device_type: newType || null,
      device_name: newType ? localDeviceName : null,
      is_active: isActive,
      notes: localNotes
    });
  };

  return (
    <div className={`flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 flex-wrap ${!isActive ? 'opacity-50' : ''}`}>
      <span className="text-xs font-mono text-slate-400 w-16 shrink-0">Porta {portNum}</span>
      
      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-accent"
        />
        <span className="text-xs text-text-secondary">Ativa</span>
      </label>

      {isActive ? (
        <>
          <div className="flex-1 min-w-[120px]">
            <Select
              value={deviceType}
              onChange={(e) => handleDeviceTypeChange(e.target.value)}
              options={DEVICE_TYPES}
            />
          </div>
          {deviceType && (
            <div className="flex-1 min-w-[150px]">
              <Input
                placeholder="Nome do dispositivo"
                value={localDeviceName}
                onChange={(e) => setLocalDeviceName(e.target.value)}
                onBlur={handleDeviceNameBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Motivo da desativação (opcional)..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

interface SwitchFormProps {
  initialData?: Switch | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function SwitchForm({ initialData, onSubmit, onCancel }: SwitchFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [totalPorts, setTotalPorts] = useState(initialData?.total_ports ?? 8)
  const [isPoe, setIsPoe] = useState(initialData?.is_poe ?? false)
  const [poeStandard, setPoeStandard] = useState(initialData?.poe_standard ?? '')
  const [poeBudgetWatts, setPoeBudgetWatts] = useState(initialData?.poe_budget_watts ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherBrandMode, setOtherBrandMode] = useState(false)

  const switchId = initialData?.id ?? null
  const { ports, savePort } = useSwitchPorts(switchId)
  const { models: switchModels, saveModel } = useEquipmentModels('switch')
  
  // Extrai marcas únicas dos modelos cadastrados
  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    switchModels.forEach((m) => { if (m.brand) brands.add(m.brand) })
    return Array.from(brands).sort().map((b) => ({ value: b, label: b }))
  }, [switchModels])

  const handleModelSelect = (modelId: string) => {
    const m = switchModels.find((x) => x.id === modelId)
    if (!m) return
    if (m.brand) setBrand(m.brand)
    if (m.model) setModel(m.model)
    if (m.max_ports) setTotalPorts(m.max_ports)
    if (m.is_poe) setIsPoe(true)
    if (m.poe_standard) setPoeStandard(m.poe_standard)
    // Não preenche name - é o identificador do Switch específico
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      name,
      brand: brand || null,
      model: model || null,
      location,
      total_ports: totalPorts,
      is_poe: isPoe,
      poe_standard: isPoe && poeStandard ? poeStandard : null,
      poe_budget_watts: isPoe && poeBudgetWatts ? Number(poeBudgetWatts) : null,
      status,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else if (brand) {
      await saveModel({ type: 'switch', brand, model: name || model, max_ports: totalPorts, is_poe: isPoe, poe_standard: poeStandard || null, resolution: null, channel_count: null, notes: null })
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

      {/* Modelo do Catálogo */}
      {switchModels.length > 0 && (
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
              ...switchModels.map((m) => ({ value: m.id, label: `${m.brand} ${m.model} ${m.max_ports ? `(${m.max_ports} portas)` : ''}` })),
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Switch Sala Técnica" />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
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
          <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: TP-Link" />
        )}
        <Input label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: TL-SG1016" />
      </div>
      {/* Campo para digitar nova marca quando selecionar "Outra" */}
      {otherBrandMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Digite a marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: TP-Link"
            autoFocus
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Rack Sala Técnica" />
        <Input label="Total de Portas" type="number" value={totalPorts.toString()} onChange={(e) => setTotalPorts(Number(e.target.value))} min={1} required />
      </div>

      {/* PoE Section */}
      <div className="border border-border-light rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPoe}
            onChange={(e) => setIsPoe(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-accent"
          />
          <span className="text-sm font-medium text-text-primary">Switch PoE</span>
          <span className="text-xs text-text-muted">(Power over Ethernet)</span>
        </label>

        {isPoe && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Select
              label="Padrão PoE"
              value={poeStandard}
              onChange={(e) => setPoeStandard(e.target.value)}
              options={POE_STANDARDS}
              placeholder="Selecione"
            />
            <Input
              label="Budget PoE (Watts)"
              type="number"
              value={poeBudgetWatts}
              onChange={(e) => setPoeBudgetWatts(e.target.value)}
              placeholder="Ex: 150"
              min={0}
            />
          </div>
        )}
      </div>

      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {/* Seção de Portas do Switch */}
      {switchId && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Conexões das Portas
          </h3>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
            {Array.from({ length: totalPorts }, (_, i) => i + 1).map((portNum) => {
              const port = ports.find((p) => p.port_number === portNum)
              return (
                <SwitchPortItem
                  key={portNum}
                  portNum={portNum}
                  port={port}
                  savePort={savePort}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Backups de Configuração */}
      {switchId && (
        <BackupManager
          clientId={initialData?.client_id ?? null}
          equipmentType="switch"
          equipmentId={switchId}
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
