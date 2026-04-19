import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSwitches } from '../hooks/useSwitches'
import type { Switch } from '../lib/types'
import DataTable, { type Column } from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import SwitchForm from '../components/forms/SwitchForm'
import { useToast } from '../components/ui/Toast'

export default function SwitchesPage() {
  const { data, loading, create, update, remove } = useSwitches()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Switch | null>(null)
  const [deleting, setDeleting] = useState<Switch | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const columns: Column<Switch>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'ip_address', label: 'IP' },
    { key: 'model', label: 'Modelo' },
    { key: 'location', label: 'Localização' },
    { key: 'total_ports', label: 'Portas', render: (s) => `${s.total_ports} portas` },
    {
      key: 'is_poe',
      label: 'PoE',
      render: (s) =>
        s.is_poe ? (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400">
            {s.poe_standard || 'PoE'}{s.poe_budget_watts ? ` · ${s.poe_budget_watts}W` : ''}
          </span>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        ),
    },
    { key: 'status', label: 'Status', render: (s) => <Badge status={s.status} /> },
  ]

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, formData)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        toast('Switch atualizado com sucesso')
      }
      return result
    }
    const result = await create(formData as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast('Switch criado com sucesso')
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) toast('Switch excluído com sucesso')
    else toast(result.error, 'error')
    setDeleteLoading(false)
    setDeleting(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Switches</h2>
          <p className="text-text-muted text-sm mt-1">{data.length} registro(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Novo Switch
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
        title={editing ? 'Editar Switch' : 'Novo Switch'}
        size="lg"
      >
        <SwitchForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir Switch"
        message={`Tem certeza que deseja excluir o Switch "${deleting?.name}"?`}
        loading={deleteLoading}
      />
    </div>
  )
}
