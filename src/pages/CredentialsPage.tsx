import { useState } from 'react'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { useCredentials } from '../hooks/useCredentials'
import type { Credential } from '../lib/types'
import { DEVICE_TYPES } from '../lib/constants'
import DataTable, { type Column } from '../components/ui/DataTable'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CredentialForm from '../components/forms/CredentialForm'
import { useToast } from '../components/ui/Toast'

function PasswordCell({ password }: { password: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{visible ? password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</span>
      <button
        onClick={() => setVisible(!visible)}
        className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export default function CredentialsPage() {
  const { data, loading, create, update, remove } = useCredentials()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Credential | null>(null)
  const [deleting, setDeleting] = useState<Credential | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const deviceTypeLabel = (val: string) => DEVICE_TYPES.find((d) => d.value === val)?.label ?? val

  const columns: Column<Credential>[] = [
    { key: 'label', label: 'Rótulo', sortable: true },
    { key: 'device_type', label: 'Tipo', render: (c) => deviceTypeLabel(c.device_type) },
    { key: 'username', label: 'Usuário' },
    { key: 'password', label: 'Senha', render: (c) => <PasswordCell password={c.password} /> },
    { key: 'ip_address', label: 'IP', render: (c) => c.ip_address ?? '-' },
    { key: 'port', label: 'Porta', render: (c) => c.port?.toString() ?? '-' },
    { key: 'protocol', label: 'Protocolo', render: (c) => c.protocol?.toUpperCase() ?? '-' },
  ]

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
          data={data}
          onEdit={(item) => { setEditing(item); setModalOpen(true) }}
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
