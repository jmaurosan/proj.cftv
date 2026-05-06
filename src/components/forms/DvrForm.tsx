import { useState, type FormEvent } from 'react'
import type { Dvr } from '../../lib/types'
import { STATUS_OPTIONS, CHANNEL_OPTIONS } from '../../lib/constants'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { Package } from 'lucide-react'

interface DvrFormProps {
  initialData?: Dvr | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function DvrForm({ initialData, onSubmit, onCancel }: DvrFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [totalChannels, setTotalChannels] = useState(initialData?.total_channels ?? 8)
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { models: dvrModels, saveModel } = useEquipmentModels('dvr')

  const handleModelSelect = (modelId: string) => {
    const m = dvrModels.find((x) => x.id === modelId)
    if (!m) return
    if (m.brand) setBrand(m.brand)
    if (m.model) { setModel(m.model); setName(m.model); }
    if (m.channel_count) setTotalChannels(m.channel_count)
  }

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
      total_channels: totalChannels,
      status,
      username: username || null,
      password: password || null,
      notes: notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else if (brand) {
      await saveModel({ type: 'dvr', brand, model: name || model, channel_count: totalChannels, resolution: null, poe_standard: null, max_ports: null, is_poe: false, notes: null })
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
      {dvrModels.length > 0 && (
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
              ...dvrModels.map((m) => ({ value: m.id, label: `${m.brand} ${m.model} ${m.channel_count ? `(${m.channel_count} canais)` : ''}` })),
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Endereço IP" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} required placeholder="192.168.1.100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Intelbras" />
        <Input label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: MHDX 3116" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Localização" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Ex: Sala de TI" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Total de Canais"
          value={totalChannels}
          onChange={(e) => setTotalChannels(Number(e.target.value))}
          options={CHANNEL_OPTIONS.map((c) => ({ value: c, label: `${c} canais` }))}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Usuário de Acesso" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
        <Input label="Senha de Acesso" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionais..." />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
