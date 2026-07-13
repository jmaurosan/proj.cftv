import { useState, type FormEvent } from 'react'
import { BatteryCharging, ShieldCheck, Zap } from 'lucide-react'
import type { EquipmentOption, Nobreak } from '../../lib/projectAssets'
import { STATUS_OPTIONS } from '../../lib/constants'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface NobreakFormProps {
  initialData?: Nobreak | null
  equipmentOptions: EquipmentOption[]
  onSubmit: (nobreak: Nobreak) => Promise<{ error: string | null }>
  onCancel: () => void
}

const PROTECTION_OPTIONS = [
  ['surge', 'Surtos de tensão'],
  ['overload', 'Sobrecarga'],
  ['short_circuit', 'Curto-circuito'],
  ['undervoltage', 'Subtensão'],
  ['overvoltage', 'Sobretensão'],
  ['thermal', 'Proteção térmica'],
] as const

const toNumber = (value: string) => Number(value.replace(',', '.')) || 0

export default function NobreakForm({ initialData, equipmentOptions, onSubmit, onCancel }: NobreakFormProps) {
  const [form, setForm] = useState(() => ({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    serialNumber: initialData?.serialNumber || '',
    installationDate: initialData?.installationDate || '',
    location: initialData?.location || '',
    ratedPowerVa: String(initialData?.ratedPowerVa || ''),
    ratedPowerWatts: String(initialData?.ratedPowerWatts || ''),
    topology: initialData?.topology || 'interactive',
    inputVoltage: initialData?.inputVoltage || '120 / 220',
    inputVoltageMode: initialData?.inputVoltageMode || 'automatic_bivolt',
    outputVoltage: String(initialData?.outputVoltage || '120'),
    outletQuantity: String(initialData?.outletQuantity || '6'),
    batteryQuantity: String(initialData?.batteryQuantity || '1'),
    batteryVoltage: String(initialData?.batteryVoltage || '12'),
    batteryCapacityAh: String(initialData?.batteryCapacityAh || '7'),
    batteryBrand: initialData?.batteryBrand || '',
    batteryModel: initialData?.batteryModel || '',
    externalBatteryConnector: initialData?.externalBatteryConnector || '',
    autonomyMinutes: String(initialData?.autonomyMinutes || ''),
    manufacturerUrl: initialData?.manufacturerUrl || '',
    status: initialData?.status || 'ativo',
    notes: initialData?.notes || '',
  }))
  const [hasProtection, setHasProtection] = useState(initialData?.hasProtection ?? true)
  const [protections, setProtections] = useState<string[]>(initialData?.protections || ['surge', 'overload', 'short_circuit'])
  const [powersWholeProject, setPowersWholeProject] = useState(initialData?.powersWholeProject ?? true)
  const [poweredEquipmentIds, setPoweredEquipmentIds] = useState<string[]>(initialData?.poweredEquipmentIds || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const now = new Date().toISOString()
    const result = await onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      installationDate: form.installationDate,
      location: form.location.trim(),
      ratedPowerVa: toNumber(form.ratedPowerVa),
      ratedPowerWatts: toNumber(form.ratedPowerWatts),
      topology: form.topology,
      inputVoltage: form.inputVoltage.trim(),
      inputVoltageMode: form.inputVoltageMode,
      outputVoltage: toNumber(form.outputVoltage),
      outletQuantity: toNumber(form.outletQuantity),
      hasProtection,
      protections: hasProtection ? protections : [],
      batteryQuantity: toNumber(form.batteryQuantity),
      batteryVoltage: toNumber(form.batteryVoltage),
      batteryCapacityAh: toNumber(form.batteryCapacityAh),
      batteryBrand: form.batteryBrand.trim(),
      batteryModel: form.batteryModel.trim(),
      externalBatteryConnector: form.externalBatteryConnector.trim(),
      autonomyMinutes: form.autonomyMinutes ? toNumber(form.autonomyMinutes) : null,
      powersWholeProject,
      poweredEquipmentIds: powersWholeProject ? [] : poweredEquipmentIds,
      manufacturerUrl: form.manufacturerUrl.trim(),
      status: form.status,
      notes: form.notes.trim(),
      createdAt: initialData?.createdAt || now,
      updatedAt: now,
    })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-primary"><BatteryCharging className="h-4 w-4 text-accent" /> Identificação</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nome" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Nobreak Rack Principal" />
          <Input label="Localização" value={form.location} onChange={(e) => update('location', e.target.value)} required placeholder="Rack da portaria" />
          <Input label="Marca" value={form.brand} onChange={(e) => update('brand', e.target.value)} required />
          <Input label="Modelo" value={form.model} onChange={(e) => update('model', e.target.value)} required />
          <Input label="SN / Número de série" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} placeholder="Número de série do equipamento" />
          <Input label="Data de instalação" type="date" value={form.installationDate} onChange={(e) => update('installationDate', e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => update('status', e.target.value)} options={STATUS_OPTIONS} />
          <Input label="Link oficial / ficha técnica" type="url" value={form.manufacturerUrl} onChange={(e) => update('manufacturerUrl', e.target.value)} placeholder="https://fabricante.com/produto" />
        </div>
      </section>

      <section className="space-y-3 border-t border-border-light pt-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-primary"><Zap className="h-4 w-4 text-amber-400" /> Especificações elétricas</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Potência nominal (VA)" type="number" min={1} value={form.ratedPowerVa} onChange={(e) => update('ratedPowerVa', e.target.value)} required />
          <Input label="Potência ativa (W)" type="number" min={1} value={form.ratedPowerWatts} onChange={(e) => update('ratedPowerWatts', e.target.value)} required />
          <Select label="Topologia" value={form.topology} onChange={(e) => update('topology', e.target.value)} options={[{ value: 'interactive', label: 'Interativo' }, { value: 'online', label: 'Online (dupla conversão)' }, { value: 'standby', label: 'Standby' }]} />
          <Input label="Tensão de entrada (V)" value={form.inputVoltage} onChange={(e) => update('inputVoltage', e.target.value)} required placeholder="120 / 220" />
          <Select label="Modo da entrada" value={form.inputVoltageMode} onChange={(e) => update('inputVoltageMode', e.target.value)} options={[{ value: 'automatic_bivolt', label: 'Bivolt automático' }, { value: 'manual_bivolt', label: 'Bivolt manual' }, { value: 'single', label: 'Tensão única' }]} />
          <Input label="Tensão de saída (V)" type="number" min={1} value={form.outputVoltage} onChange={(e) => update('outputVoltage', e.target.value)} required />
          <Input label="Tomadas de saída" type="number" min={1} value={form.outletQuantity} onChange={(e) => update('outletQuantity', e.target.value)} required />
          <Input label="Autonomia estimada (min)" type="number" min={0} value={form.autonomyMinutes} onChange={(e) => update('autonomyMinutes', e.target.value)} />
        </div>
      </section>

      <section className="space-y-3 border-t border-border-light pt-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-primary"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Proteções</h3>
        <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={hasProtection} onChange={(e) => setHasProtection(e.target.checked)} className="accent-cyan-500" /> Possui proteção elétrica</label>
        {hasProtection && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PROTECTION_OPTIONS.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 rounded border border-border-light bg-bg-primary/40 px-3 py-2 text-xs text-text-secondary">
            <input type="checkbox" checked={protections.includes(value)} onChange={(e) => setProtections((current) => e.target.checked ? [...current, value] : current.filter((item) => item !== value))} className="accent-cyan-500" /> {label}
          </label>
        ))}</div>}
      </section>

      <section className="space-y-3 border-t border-border-light pt-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Banco de baterias</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input label="Quantidade" type="number" min={1} value={form.batteryQuantity} onChange={(e) => update('batteryQuantity', e.target.value)} required />
          <Input label="Tensão por bateria (V)" type="number" min={1} value={form.batteryVoltage} onChange={(e) => update('batteryVoltage', e.target.value)} required />
          <Input label="Capacidade (Ah)" type="number" min={0.1} step="0.1" value={form.batteryCapacityAh} onChange={(e) => update('batteryCapacityAh', e.target.value)} required />
          <Input label="Marca da bateria" value={form.batteryBrand} onChange={(e) => update('batteryBrand', e.target.value)} />
          <Input label="Modelo da bateria" value={form.batteryModel} onChange={(e) => update('batteryModel', e.target.value)} />
          <Input label="Conector da bateria externa" value={form.externalBatteryConnector} onChange={(e) => update('externalBatteryConnector', e.target.value)} placeholder="Ex.: SB 50" />
        </div>
      </section>

      <section className="space-y-3 border-t border-border-light pt-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Equipamentos alimentados</h3>
        <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={powersWholeProject} onChange={(e) => setPowersWholeProject(e.target.checked)} className="accent-cyan-500" /> Alimenta todo o sistema deste cliente</label>
        {!powersWholeProject && <div className="max-h-44 space-y-1 overflow-y-auto rounded border border-border-light bg-bg-primary/30 p-2">{equipmentOptions.map((equipment) => (
          <label key={`${equipment.type}:${equipment.id}`} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-bg-tertiary">
            <span className="text-text-secondary">{equipment.name}</span><span className="flex items-center gap-2 text-text-muted"><span>{equipment.typeLabel}</span><input type="checkbox" checked={poweredEquipmentIds.includes(equipment.id)} onChange={(e) => setPoweredEquipmentIds((current) => e.target.checked ? [...current, equipment.id] : current.filter((id) => id !== equipment.id))} className="accent-cyan-500" /></span>
          </label>
        ))}</div>}
      </section>

      <Input label="Observações" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button></div>
    </form>
  )
}
