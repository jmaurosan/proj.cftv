import { useState, type FormEvent } from 'react'
import type { ProjectMonitor, Rack } from '../../lib/types'
import { STATUS_OPTIONS } from '../../lib/constants'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

const VOLTAGES = ['12V', '19V', '24V', '110V', '220V', 'Bivolt 110/220V']

export default function MonitorForm({ initialData, racks, knownModels, onSubmit, onCancel }: {
  initialData?: ProjectMonitor | null
  racks: Rack[]
  knownModels: ProjectMonitor[]
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [powerWatts, setPowerWatts] = useState(initialData?.power_watts?.toString() ?? '')
  const [voltageOption, setVoltageOption] = useState(VOLTAGES.includes(initialData?.input_voltage ?? '') ? initialData!.input_voltage : initialData?.input_voltage ? 'other' : 'Bivolt 110/220V')
  const [customVoltage, setCustomVoltage] = useState(VOLTAGES.includes(initialData?.input_voltage ?? '') ? '' : initialData?.input_voltage ?? '')
  const [rackId, setRackId] = useState(initialData?.rack_id ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const applyKnownModel = (value: string) => {
    setModel(value)
    const known = knownModels.find((item) => item.model.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'))
    if (!known) return
    setBrand(known.brand); setPowerWatts(known.power_watts?.toString() ?? '')
    if (VOLTAGES.includes(known.input_voltage)) { setVoltageOption(known.input_voltage); setCustomVoltage('') } else { setVoltageOption('other'); setCustomVoltage(known.input_voltage) }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null)
    const inputVoltage = voltageOption === 'other' ? customVoltage.trim() : voltageOption
    const result = await onSubmit({ name, brand, model, power_watts: powerWatts ? Number(powerWatts) : null, input_voltage: inputVoltage, rack_id: rackId || null, location: location || null, serial_number: serialNumber || null, status, notes: notes || null })
    if (result.error) setError(result.error); setLoading(false)
  }
  return <form onSubmit={submit} className="space-y-5">
    {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Nome/identificação" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Monitor Portaria" /><Select label="Rack (opcional)" value={rackId} onChange={(e) => setRackId(e.target.value)} options={racks.map((rack) => ({ value: rack.id, label: rack.name }))} placeholder="Sem rack" /></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} required list="monitor-brands" /><Input label="Modelo" value={model} onChange={(e) => applyKnownModel(e.target.value)} required list="monitor-models" /></div>
    <datalist id="monitor-brands">{Array.from(new Set(knownModels.map((item) => item.brand))).map((item) => <option key={item} value={item} />)}</datalist>
    <datalist id="monitor-models">{Array.from(new Set(knownModels.map((item) => item.model))).map((item) => <option key={item} value={item} />)}</datalist>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Potência (W)" type="number" min={0} step="0.01" value={powerWatts} onChange={(e) => setPowerWatts(e.target.value)} /><Select label="Tensão de entrada" value={voltageOption} onChange={(e) => setVoltageOption(e.target.value)} options={[...VOLTAGES.map((value) => ({ value, label: value })), { value: 'other', label: 'Outra tensão' }]} /></div>
    {voltageOption === 'other' && <Input label="Tensão personalizada" value={customVoltage} onChange={(e) => setCustomVoltage(e.target.value)} required placeholder="Ex: 14V DC" />}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} /><Input label="Número de série" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></div>
    <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
    <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
    <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar monitor'}</Button></div>
  </form>
}
