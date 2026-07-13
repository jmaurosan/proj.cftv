import { useState, type FormEvent } from 'react'
import type { Rack } from '../../lib/types'
import type { EquipmentOption } from '../../lib/projectAssets'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface RackFormProps {
  initialData?: Rack | null
  equipmentOptions: EquipmentOption[]
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function RackForm({ initialData, equipmentOptions, onSubmit, onCancel }: RackFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [equipmentIds, setEquipmentIds] = useState<string[]>(initialData?.equipment_ids ?? [])
  const [hasNobreak, setHasNobreak] = useState(initialData?.has_nobreak ?? false)
  const [powerNotes, setPowerNotes] = useState(initialData?.power_notes ?? '')
  const [cableNotes, setCableNotes] = useState(initialData?.cable_notes ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggleEquipment = (id: string) => setEquipmentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null)
    const result = await onSubmit({
      topology_id: initialData?.topology_id || `rack-${crypto.randomUUID()}`,
      name, location, equipment_ids: equipmentIds, has_nobreak: hasNobreak,
      power_notes: powerNotes || null, cable_notes: cableNotes || null,
      media_paths: initialData?.media_paths ?? [], notes: notes || null,
    })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return <form onSubmit={submit} className="space-y-5">
    {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input label="Nome do rack/quadro" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Rack Portaria" />
      <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Guarita / Bloco B" />
    </div>
    <div className="rounded-lg border border-border-light bg-bg-primary p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-text-secondary"><span>Equipamentos internos</span><span className="text-accent">{equipmentIds.length} selecionado(s)</span></div>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {equipmentOptions.length === 0 ? <p className="py-4 text-center text-xs text-text-muted">Nenhum equipamento disponível.</p> : equipmentOptions.map((item) => (
          <label key={`${item.type}-${item.id}`} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-bg-tertiary">
            <input type="checkbox" checked={equipmentIds.includes(item.id)} onChange={() => toggleEquipment(item.id)} />
            <span className="text-[10px] uppercase text-text-muted">{item.typeLabel}</span><span className="text-sm text-text-primary">{item.name}</span>
          </label>
        ))}
      </div>
    </div>
    <label className="flex items-center gap-3 rounded-lg border border-border-light p-3 text-sm text-text-primary">
      <input type="checkbox" checked={hasNobreak} onChange={(e) => setHasNobreak(e.target.checked)} /> Nobreak instalado neste rack/quadro
    </label>
    <Input label="Alimentação/fontes" value={powerNotes} onChange={(e) => setPowerNotes(e.target.value)} placeholder="Ex: fontes 12V 10A, régua, circuito, disjuntor" />
    <Input label="Cabos e interligações" value={cableNotes} onChange={(e) => setCableNotes(e.target.value)} placeholder="Ex: fibra, UTP, coaxial, saída para DVR" />
    <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
    <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar rack'}</Button></div>
  </form>
}
