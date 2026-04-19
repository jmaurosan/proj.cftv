import { useState, type FormEvent } from 'react'
import type { Switch } from '../../lib/types'
import { STATUS_OPTIONS } from '../../lib/constants'
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
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [totalPorts, setTotalPorts] = useState(initialData?.total_ports ?? 8)
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
      ip_address: ipAddress,
      model: model || null,
      location,
      total_ports: totalPorts,
      status,
      notes: notes || null,
    })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Endereço IP" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} required placeholder="192.168.1.1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: TP-Link TL-SG1016" />
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Total de Portas" type="number" value={totalPorts} onChange={(e) => setTotalPorts(Number(e.target.value))} min={1} required />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
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
