import { useState, useMemo } from 'react'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { useCredentials } from '../hooks/useCredentials'
import type { Credential } from '../lib/types'
import { DEVICE_TYPES, PROTOCOL_OPTIONS } from '../lib/constants'
import DataTable, { type Column } from '../components/ui/DataTable'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CredentialForm from '../components/forms/CredentialForm'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'

function PasswordCell({ credential, onReveal }: { credential: Credential; onReveal: (id: string) => Promise<{ password: string | null; error: string | null }> }) {
  const [visible, setVisible] = useState(false)
  const [password, setPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const handleToggle = async () => {
    if (visible) {
      setVisible(false)
      return
    }
    if (password == null) {
      setLoading(true)
      const result = await onReveal(credential.id)
      setLoading(false)
      if (result.error) return
      setPassword(result.password ?? '')
    }
    setVisible(true)
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{loading ? 'Carregando...' : visible ? password : credential.secret_available ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '-'}</span>
      <button
        onClick={handleToggle}
        disabled={loading || !credential.secret_available}
        className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export default function CredentialsPage() {
  const { data, loading, create, update, remove, reveal } = useCredentials()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Credential | null>(null)
  const [deleting, setDeleting] = useState<Credential | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sortKey, setSortKey] = useState<string>('label')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aData = a as unknown as Record<string, unknown>
      const bData = b as unknown as Record<string, unknown>
      const aVal = aData[sortKey]?.toString() || ''
      const bVal = bData[sortKey]?.toString() || ''
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir])

  const deviceTypeLabel = (val: string) => DEVICE_TYPES.find((d) => d.value === val)?.label ?? val
  const protocolLabel = (val: string | null) => PROTOCOL_OPTIONS.find((item) => item.value === val)?.label ?? val?.toUpperCase() ?? '-'

  const columns: Column<Credential>[] = [
    { key: 'label', label: 'Rótulo', sortable: true },
    { key: 'device_type', label: 'Tipo', sortable: true, render: (c) => deviceTypeLabel(c.device_type) },
    { key: 'username', label: 'Usuário', sortable: true },
    { key: 'password', label: 'Senha', render: (c) => <PasswordCell credential={c} onReveal={handleRevealPassword} /> },
    { key: 'ip_address', label: 'IP', sortable: true, render: (c) => c.ip_address ?? '-' },
    { key: 'port', label: 'Porta', sortable: true, render: (c) => c.port?.toString() ?? '-' },
    { key: 'protocol', label: 'Tipo de acesso', sortable: true, render: (c) => protocolLabel(c.protocol) },
    { key: 'serial_number', label: 'Nº de série', sortable: true, render: (c) => c.serial_number ?? '-' },
  ]

  async function handleRevealPassword(id: string) {
    const result = await reveal(id)
    if (result.error) toast(result.error, 'error')
    return { password: result.data?.password ?? null, error: result.error }
  }

  const handleEdit = async (item: Credential) => {
    const result = await reveal(item.id)
    if (result.error || !result.data) {
      toast(result.error || 'Não foi possível carregar a credencial para edição.', 'error')
      return
    }
    setEditing({ ...item, ...result.data })
    setModalOpen(true)
  }

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, formData)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        toast('Credencial atualizada com sucesso')
      }
      return result
    }
    const result = await create(formData as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast('Credencial criada com sucesso')
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) toast('Credencial excluída com sucesso')
    else toast(result.error, 'error')
    setDeleteLoading(false)
    setDeleting(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Credenciais</h2>
          <p className="text-text-muted text-sm mt-1">{data.length} registro(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Nova Credencial
        </Button>
      </div>

      <div className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={sortedData}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={(item) => setDeleting(item)}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar Credencial' : 'Nova Credencial'}
        size="lg"
      >
        <CredentialForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir Credencial"
        message={`Tem certeza que deseja excluir a credencial "${deleting?.label}"?`}
        loading={deleteLoading}
      />
    </div>
  )
}
