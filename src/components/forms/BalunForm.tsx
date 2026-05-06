import { useState, type FormEvent } from 'react'
import type { PowerBalun } from '../../lib/types'
import { STATUS_OPTIONS } from '../../lib/constants'
import { useBalunPorts } from '../../hooks/useBalunPorts'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { useCameras } from '../../hooks/useCameras'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { Plug, Camera, Package } from 'lucide-react'

interface BalunFormProps {
  initialData?: PowerBalun | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function BalunForm({ initialData, onSubmit, onCancel }: BalunFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [totalPorts, setTotalPorts] = useState(initialData?.total_ports ?? 4)
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const balunId = initialData?.id ?? null
  const { ports, savePort } = useBalunPorts(balunId)
  const { data: cameras } = useCameras()
  const { models: balunModels, saveModel } = useEquipmentModels('balun')

  const handleModelSelect = (modelId: string) => {
    const m = balunModels.find((x) => x.id === modelId)
    if (!m) return
    if (m.model) setName(m.model)
    if (m.max_ports) setTotalPorts(m.max_ports)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      name,
      location,
      total_ports: totalPorts,
      status,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else if (name) {
      await saveModel({ type: 'balun', brand: 'Power Balun', model: name, max_ports: totalPorts, resolution: null, channel_count: null, poe_standard: null, is_poe: false, notes: null })
    }
    setLoading(false)
  }

  const handlePortChange = async (portNumber: number, cameraId: string) => {
    if (!balunId) return
    await savePort({ port_number: portNumber, camera_id: cameraId || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Modelo do Catálogo */}
      {balunModels.length > 0 && (
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
              ...balunModels.map((m) => ({ value: m.id, label: `${m.model} ${m.max_ports ? `(${m.max_ports} portas)` : ''}` })),
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Poste frontal" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Total de Portas" type="number" value={totalPorts.toString()} onChange={(e) => setTotalPorts(Number(e.target.value))} min={1} required />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
      </div>
      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {/* Seção de Portas do Balun */}
      {balunId && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Conexões das Portas
          </h3>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
            {Array.from({ length: totalPorts }, (_, i) => i + 1).map((portNum) => {
              const port = ports.find((p) => p.port_number === portNum)
              const cameraId = port?.camera_id ?? ''
              return (
                <div key={portNum} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-slate-400 w-16 shrink-0">Porta {portNum}</span>
                  <Select
                    value={cameraId}
                    onChange={(e) => handlePortChange(portNum, e.target.value)}
                    options={[
                      { value: '', label: 'Desconectado' },
                      ...cameras.map((c) => ({
                        value: c.id,
                        label: `${c.name} ${c.dvrs?.name ? `(${c.dvrs.name} CH${c.channel_number || '?'})` : ''}`,
                      })),
                    ]}
                  />
                  {port?.cameras?.name && (
                    <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                      <Camera className="w-3 h-3" />
                      {port.cameras.dvrs?.name} CH{port.cameras.channel_number || '?'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
