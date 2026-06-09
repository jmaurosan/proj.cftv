import { useState, useMemo } from 'react'
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
import ClientFilterBanner from '../components/ui/ClientFilterBanner'

export default function DvrsPage() {
  const { data, loading, create, update, remove } = useDvrs()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Dvr | null>(null)
  const [deleting, setDeleting] = useState<Dvr | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sortKey, setSortKey] = useState<string>('name')
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
      let aVal: string | number = ''
      let bVal: string | number = ''
      const aData = a as unknown as Record<string, unknown>
      const bData = b as unknown as Record<string, unknown>

      if (sortKey === 'ip_address') {
        // Ordena IPs numericamente (por último octeto)
        aVal = parseInt(aData.ip_address?.toString().split('.').pop() || '0')
        bVal = parseInt(bData.ip_address?.toString().split('.').pop() || '0')
      } else if (sortKey === 'total_channels') {
        aVal = (aData.total_channels as number) || 0
        bVal = (bData.total_channels as number) || 0
      } else {
        aVal = aData[sortKey]?.toString() || ''
        bVal = bData[sortKey]?.toString() || ''
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir])

  const columns: Column<Dvr>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'ip_address', label: 'IP', sortable: true },
    { key: 'model', label: 'Modelo', sortable: true },
    { key: 'location', label: 'Localização', sortable: true },
    { key: 'total_channels', label: 'Canais', sortable: true, render: (d) => `${d.total_channels} ch` },
    { key: 'status', label: 'Status', sortable: true, render: (d) => <Badge status={d.status} /> },
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
      <ClientFilterBanner />
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
          data={sortedData}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={(item) => { setEditing(item); setModalOpen(true) }}
          onDelete={(item) => setDeleting(item)}
          onRowClick={(item) => { setEditing(item); setModalOpen(true) }}
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
