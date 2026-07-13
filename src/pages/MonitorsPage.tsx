import { useState } from 'react'
import { Monitor, Plus } from 'lucide-react'
import type { ProjectMonitor } from '../lib/types'
import { useProjectMonitors } from '../hooks/useProjectMonitors'
import { useRacks } from '../hooks/useRacks'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import DataTable, { type Column } from '../components/ui/DataTable'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import MonitorForm from '../components/forms/MonitorForm'

export default function MonitorsPage() {
  const { selectedClientId } = useClient()
  const { data, loading, error, create, update, remove } = useProjectMonitors()
  const { data: racks } = useRacks()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectMonitor | null>(null)
  const [deleting, setDeleting] = useState<ProjectMonitor | null>(null)
  const columns: Column<ProjectMonitor>[] = [
    { key: 'name', label: 'Identificação' }, { key: 'brand', label: 'Marca' }, { key: 'model', label: 'Modelo' },
    { key: 'power_watts', label: 'Potência', render: (item) => item.power_watts == null ? '—' : `${item.power_watts} W` },
    { key: 'input_voltage', label: 'Entrada' }, { key: 'rack_id', label: 'Rack', render: (item) => item.racks?.name ?? 'Sem rack' },
    { key: 'status', label: 'Status', render: (item) => <Badge status={item.status} /> },
  ]
  const submit = async (payload: Record<string, unknown>) => {
    const result = editing ? await update(editing.id, payload) : await create(payload as Parameters<typeof create>[0])
    if (!result.error) { toast(editing ? 'Monitor atualizado com sucesso' : 'Monitor criado com sucesso'); setOpen(false); setEditing(null) }
    return result
  }
  const confirmDelete = async () => {
    if (!deleting) return
    const result = await remove(deleting.id)
    if (result.error) toast(result.error, 'error'); else toast('Monitor excluído com sucesso')
    setDeleting(null)
  }
  if (loading) return <LoadingSpinner />
  return <div className="space-y-6">
    <ClientFilterBanner />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-text-primary"><Monitor className="h-5 w-5 text-accent" /> Monitores</h2><p className="mt-1 text-sm text-text-muted">Monitores utilizados no projeto e seus dados elétricos.</p></div><Button onClick={() => { setEditing(null); setOpen(true) }} disabled={!selectedClientId}><Plus className="h-4 w-4" /> Novo Monitor</Button></div>
    {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
    <div className="overflow-hidden rounded-xl border border-border-light bg-bg-secondary"><DataTable columns={columns} data={data} onEdit={(item) => { setEditing(item); setOpen(true) }} onDelete={setDeleting} /></div>
    <Modal open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? 'Editar Monitor' : 'Novo Monitor'} size="lg"><MonitorForm initialData={editing} racks={racks} knownModels={data} onSubmit={submit} onCancel={() => { setOpen(false); setEditing(null) }} /></Modal>
    <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Excluir monitor" message={`Excluir o monitor "${deleting?.name}"?`} />
  </div>
}
