import { useState, type FormEvent } from 'react'
import type { Switch } from '../../lib/types'
import { STATUS_OPTIONS, POE_STANDARDS } from '../../lib/constants'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface SwitchFormProps {
  initialData?: Switch | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function SwitchForm({ initialData, onSubmit, onCancel }: SwitchFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      name,
      brand: brand || null,
      ip_address: ipAddress,
      model: model || null,
      location,
      total_ports: totalPorts,
      is_poe: isPoe,
      poe_standard: isPoe && poeStandard ? poeStandard : null,
      poe_budget_watts: isPoe && poeBudgetWatts ? Number(poeBudgetWatts) : null,
      status,
      notes: notes || null,
    })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Endereço IP" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} required placeholder="192.168.1.1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: TP-Link" />
        <Input label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: TL-SG1016" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Total de Portas" type="number" value={totalPorts.toString()} onChange={(e) => setTotalPorts(Number(e.target.value))} min={1} required />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
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
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
