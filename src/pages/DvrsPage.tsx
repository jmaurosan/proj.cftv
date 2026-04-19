import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDvrs } from '../hooks/useDvrs'
import type { Dvr } from '../lib/types'
import DataTable, { type Column } from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import DvrForm from '../components/forms/DvrForm'
import { useToast } from '../components/ui/Toast'

export default function DvrsPage() {
  const { data, loading, create, update, remove } = useDvrs()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Dvr | null>(null)
  const [deleting, setDeleting] = useState<Dvr | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const columns: Column<Dvr>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'ip_address', label: 'IP' },
    { key: 'model', label: 'Modelo' },
    { key: 'location', label: 'Localização' },
    { key: 'total_channels', label: 'Canais', render: (d) => `${d.total_channels} ch` },
    { key: 'status', label: 'Status', render: (d) => <Badge status={d.status} /> },
  ]

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, formData)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        toast('DVR atualizado com sucesso')
      }
      return result
    }
    const result = await create(formData as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast('DVR criado com sucesso')
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) {
      toast('DVR excluído com sucesso')
    } else {
      toast(result.error, 'error')
    }
    setDeleteLoading(false)
    setDeleting(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">DVRs</h2>
          <p className="text-text-muted text-sm mt-1">{data.length} registro(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Novo DVR
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
        title={editing ? 'Editar DVR' : 'Novo DVR'}
        size="lg"
      >
        <DvrForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir DVR"
        message={`Tem certeza que deseja excluir o DVR "${deleting?.name}"? Esta ação não pode ser desfeita.`}
        loading={deleteLoading}
      />
    </div>
  )
}
