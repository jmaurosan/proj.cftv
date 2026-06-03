import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { Credential } from '../../lib/types'
import { DEVICE_TYPES, PROTOCOL_OPTIONS } from '../../lib/constants'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface CredentialFormProps {
  initialData?: Credential | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function CredentialForm({ initialData, onSubmit, onCancel }: CredentialFormProps) {
  const [label, setLabel] = useState(initialData?.label ?? '')
  const [deviceType, setDeviceType] = useState(initialData?.device_type ?? 'dvr')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [port, setPort] = useState<string>(initialData?.port?.toString() ?? '')
  const [protocol, setProtocol] = useState(initialData?.protocol ?? 'http')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await onSubmit({
      label,
      device_type: deviceType,
      username,
      password,
      ip_address: ipAddress || null,
      port: port ? Number(port) : null,
      protocol,
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

      {/* Linha 1: Rótulo + Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Rótulo" value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Ex: DVR Principal" />
        <Select label="Tipo de Dispositivo" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} options={DEVICE_TYPES} />
      </div>

      {/* Linha 2: Usuário + Senha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="admin" />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Linha 3: IP + Porta + Protocolo (1 coluna no mobile, 3 no desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Endereço IP" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.100" />
        <Input label="Porta" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="80" />
        <Select label="Protocolo" value={protocol} onChange={(e) => setProtocol(e.target.value)} options={PROTOCOL_OPTIONS} />
      </div>

      {/* Linha 4: Observações */}
      <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
