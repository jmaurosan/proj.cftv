import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useBaluns } from '../hooks/useBaluns'
import type { PowerBalun } from '../lib/types'
import DataTable, { type Column } from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import BalunForm from '../components/forms/BalunForm'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'

export default function BalunsPage() {
  const { data, loading, create, update, remove } = useBaluns()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PowerBalun | null>(null)
  const [deleting, setDeleting] = useState<PowerBalun | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'passive' | 'power'>('all')
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
    const filtered = typeFilter === 'all' ? data : data.filter((item) => (item.balun_type ?? 'power') === typeFilter)
    return [...filtered].sort((a, b) => {
      const aData = a as unknown as Record<string, unknown>
      const bData = b as unknown as Record<string, unknown>
      const aVal = aData[sortKey]?.toString() || ''
      const bVal = bData[sortKey]?.toString() || ''
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir, typeFilter])

  const getBalunTypeLabel = (type?: PowerBalun['balun_type']) => type === 'passive' ? 'Balun passivo' : 'Power Balun'

  const columns: Column<PowerBalun>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'balun_type', label: 'Tipo', sortable: true, render: (b) => getBalunTypeLabel(b.balun_type) },
    { key: 'location', label: 'Localização', sortable: true },
    { key: 'total_ports', label: 'Portas/Pontos', sortable: true, render: (b) => `${b.total_ports} ${(b.balun_type ?? 'power') === 'passive' ? 'ponto(s)' : 'porta(s)'}` },
    { key: 'status', label: 'Status', sortable: true, render: (b) => <Badge status={b.status} /> },
  ]

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, formData)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        toast(`${getBalunTypeLabel(formData.balun_type as PowerBalun['balun_type'])} atualizado com sucesso`)
      }
      return result
    }
    const result = await create(formData as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast(`${getBalunTypeLabel(formData.balun_type as PowerBalun['balun_type'])} criado com sucesso`)
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) toast(`${getBalunTypeLabel(deleting.balun_type)} excluído com sucesso`)
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
          <h2 className="text-xl font-bold text-text-primary">Baluns</h2>
          <p className="text-text-muted text-sm mt-1">{sortedData.length} de {data.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            options={[
              { value: 'all', label: 'Todos os baluns' },
              { value: 'power', label: 'Power Baluns' },
              { value: 'passive', label: 'Baluns passivos' },
            ]}
          />
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4" /> Novo Balun
          </Button>
        </div>
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
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? `Editar ${getBalunTypeLabel(editing.balun_type)}` : 'Novo Balun'}
      >
        <BalunForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={`Excluir ${getBalunTypeLabel(deleting?.balun_type)}`}
        message={`Tem certeza que deseja excluir "${deleting?.name}"?`}
        loading={deleteLoading}
      />
    </div>
  )
}
