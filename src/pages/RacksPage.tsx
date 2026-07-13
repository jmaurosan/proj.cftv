import { useState } from 'react'
import { Plus, ServerCog } from 'lucide-react'
import type { Rack } from '../lib/types'
import { useRacks } from '../hooks/useRacks'
import { useEquipmentOptions } from '../hooks/useEquipmentOptions'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import DataTable, { type Column } from '../components/ui/DataTable'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import RackForm from '../components/forms/RackForm'

export default function RacksPage() {
  const { selectedClientId } = useClient()
  const { data, loading, error, create, update, remove } = useRacks()
  const { options } = useEquipmentOptions(selectedClientId)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Rack | null>(null)
  const [deleting, setDeleting] = useState<Rack | null>(null)
  const columns: Column<Rack>[] = [
    { key: 'name', label: 'Rack/Quadro' }, { key: 'location', label: 'Localização' },
    { key: 'equipment_ids', label: 'Equipamentos', render: (item) => `${item.equipment_ids.length} item(ns)` },
    { key: 'has_nobreak', label: 'Nobreak', render: (item) => item.has_nobreak ? 'Sim' : 'Não' },
  ]
  const submit = async (payload: Record<string, unknown>) => {
    const result = editing ? await update(editing.id, payload) : await create(payload as Parameters<typeof create>[0])
    if (!result.error) { toast(editing ? 'Rack atualizado com sucesso' : 'Rack criado com sucesso'); setOpen(false); setEditing(null) }
    return result
  }
  const confirmDelete = async () => {
    if (!deleting) return
    const result = await remove(deleting.id)
    if (result.error) toast(result.error, 'error'); else toast('Rack excluído com sucesso')
    setDeleting(null)
  }
  if (loading) return <LoadingSpinner />
  return <div className="space-y-6">
    <ClientFilterBanner />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-text-primary"><ServerCog className="h-5 w-5 text-accent" /> Racks e Quadros</h2><p className="mt-1 text-sm text-text-muted">Inventário físico integrado à topologia de rede.</p></div><Button onClick={() => { setEditing(null); setOpen(true) }} disabled={!selectedClientId}><Plus className="h-4 w-4" /> Novo Rack</Button></div>
    {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
    <div className="overflow-hidden rounded-xl border border-border-light bg-bg-secondary"><DataTable columns={columns} data={data} onEdit={(item) => { setEditing(item); setOpen(true) }} onDelete={setDeleting} /></div>
    <Modal open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? 'Editar Rack/Quadro' : 'Novo Rack/Quadro'} size="lg"><RackForm initialData={editing} equipmentOptions={options} onSubmit={submit} onCancel={() => { setOpen(false); setEditing(null) }} /></Modal>
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Excluir rack" message={`Excluir "${deleting?.name}"? Os equipamentos não serão excluídos.`} />
  </div>
}
