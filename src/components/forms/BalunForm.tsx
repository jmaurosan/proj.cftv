import { useState, type FormEvent } from 'react'
import type { PowerBalun } from '../../lib/types'
import { STATUS_OPTIONS } from '../../lib/constants'
import { useBalunPorts } from '../../hooks/useBalunPorts'
import { useBalun4x1Outputs, get4x1Outputs } from '../../hooks/useBalun4x1Outputs'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { useCameras } from '../../hooks/useCameras'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { Plug, Camera, Package, Layers } from 'lucide-react'

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
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({})
  const [editingOutputNotes, setEditingOutputNotes] = useState<Record<number, string>>({})

  const balunId = initialData?.id ?? null
  const { ports, savePort } = useBalunPorts(balunId)
  const { outputs: outputs4x1, saveOutput } = useBalun4x1Outputs(balunId)
  const { data: cameras } = useCameras()
  const { models: balunModels, saveModel } = useEquipmentModels('balun')
  
  // Calcula as saídas 4x1 baseado no total de portas
  const expectedOutputs = get4x1Outputs(totalPorts)

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

  const handlePortActiveToggle = async (portNumber: number, isActive: boolean) => {
    if (!balunId) return
    await savePort({ port_number: portNumber, camera_id: ports.find(p => p.port_number === portNumber)?.camera_id || null, is_active: isActive })
  }

  const handlePortNotesSave = async (portNumber: number) => {
    if (!balunId) return
    const notes = editingNotes[portNumber] ?? ''
    await savePort({ port_number: portNumber, camera_id: ports.find(p => p.port_number === portNumber)?.camera_id || null, notes })
  }

  // Função para encontrar a saída 4x1 de uma porta
  const getOutputForPort = (portNumber: number) => {
    return outputs4x1.find(o => portNumber >= o.channel_start && portNumber <= o.channel_end)
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

      {/* Seção de Saídas 4x1 */}
      {balunId && totalPorts >= 4 && (
        <div className="border border-blue-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Saídas 4x1 ({expectedOutputs.length} saída${expectedOutputs.length !== 1 ? 's' : ''})
          </h3>
          <p className="text-xs text-text-muted">
            Agrupe 4 câmeras por saída 4x1. Cada saída conecta as câmeras ao DVR por um único cabo UTP.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expectedOutputs.map((output) => {
              const outputData = outputs4x1.find(o => o.output_number === output.output_number)
              const camerasInOutput = cameras.filter(c => {
                const port = ports.find(p => p.camera_id === c.id)
                return port && port.port_number >= output.channel_start && port.port_number <= output.channel_end
              })
              return (
                <div key={output.output_number} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-400">
                      4x1 - Saída {output.output_number}
                    </span>
                    <span className="text-xs text-text-muted">
                      Portas {output.channel_start}-{output.channel_end}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mb-2">
                    {camerasInOutput.length > 0 
                      ? camerasInOutput.map(c => c.name).join(', ')
                      : 'Nenhuma câmera conectada'
                    }
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingOutputNotes[output.output_number] !== undefined 
                        ? editingOutputNotes[output.output_number] 
                        : (outputData?.notes ?? '')}
                      onChange={(e) => setEditingOutputNotes((prev) => ({ ...prev, [output.output_number]: e.target.value }))}
                      onBlur={() => {
                        const notes = editingOutputNotes[output.output_number] ?? ''
                        saveOutput({ 
                          output_number: output.output_number,
                          channel_start: output.channel_start,
                          channel_end: output.channel_end,
                          notes 
                        })
                      }}
                      placeholder="Observações da saída (opcional)"
                      className="flex-1 px-2 py-1 text-xs bg-bg-tertiary border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Seção de Portas do Balun */}
      {balunId && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Conexões das Portas ({totalPorts} portas)
          </h3>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
            {Array.from({ length: totalPorts }, (_, i) => i + 1).map((portNum) => {
              const port = ports.find((p) => p.port_number === portNum)
              const cameraId = port?.camera_id ?? ''
              const isActive = port?.is_active ?? true
              const portNotes = port?.notes ?? ''
              const currentNotes = editingNotes[portNum] !== undefined ? editingNotes[portNum] : portNotes
              const outputInfo = getOutputForPort(portNum)
              
              // Encontra a câmera na lista para exibir o label correto
              const selectedCamera = cameras.find(c => c.id === cameraId)
              
              return (
                <div key={portNum} className={`flex flex-wrap items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 ${!isActive ? 'opacity-50' : ''}`}>
                  <span className="text-xs font-mono text-slate-400 w-16 shrink-0">Porta {portNum}</span>
                  {outputInfo && (
                    <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded shrink-0">
                      4x1-{outputInfo.output_number}
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => handlePortActiveToggle(portNum, e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-accent"
                    />
                    <span className="text-xs text-text-secondary">Ativa</span>
                  </label>
                  <select
                    value={cameraId}
                    onChange={(e) => handlePortChange(portNum, e.target.value)}
                    className="flex-1 min-w-[150px] px-3 py-2 bg-bg-primary border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-sm"
                  >
                    <option value="">Desconectado</option>
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.dvrs?.name ? `(${c.dvrs.name} CH${c.channel_number || '?'})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedCamera && (
                    <span className="text-xs text-success flex items-center gap-1 shrink-0">
                      <Camera className="w-3 h-3" />
                      {selectedCamera.dvrs?.name} CH{selectedCamera.channel_number || '?'}
                    </span>
                  )}
                  {isActive && (
                    <div className="w-full flex gap-2 mt-1">
                      <input
                        type="text"
                        value={currentNotes}
                        onChange={(e) => setEditingNotes((prev) => ({ ...prev, [portNum]: e.target.value }))}
                        onBlur={() => handlePortNotesSave(portNum)}
                        placeholder="Observações da porta (problemas, manutenções...)"
                        className="flex-1 px-2 py-1 text-xs bg-bg-tertiary border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
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
