import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileImage, History, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../components/ui/Toast'
import { uploadMaintenanceMedia } from '../services/storageService'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'

interface Equipment { id: string; name: string; type: string }
interface MaintenanceRecord { id: string; equipment_type: string; equipment_id: string; equipment_name: string; problem_found: string; service_performed: string; replaced_part: string | null; technician_name: string; result_status: string; performed_at: string; notes: string | null; evidence_paths: string[]; created_at: string }

const typeLabels: Record<string, string> = { camera: 'Câmera', dvr: 'DVR/NVR', switch: 'Switch', balun: 'Power Balun', router: 'Roteador', monitor: 'Monitor', nobreak: 'Nobreak' }
const statusLabels: Record<string, string> = { resolved: 'Resolvido', monitoring: 'Em observação', pending: 'Pendente', unresolved: 'Não resolvido' }
const statusClasses: Record<string, string> = { resolved: 'bg-success/10 text-success', monitoring: 'bg-primary/10 text-primary', pending: 'bg-warning/10 text-warning', unresolved: 'bg-danger/10 text-danger' }
const initialForm = { equipmentKey: '', problem: '', service: '', part: '', technician: '', status: 'resolved', date: new Date().toISOString().slice(0, 16), notes: '' }

export default function MaintenanceHistoryPage() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const { toast } = useToast()
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<MaintenanceRecord | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [files, setFiles] = useState<File[]>([])
  const [form, setForm] = useState(initialForm)

  const load = useCallback(async () => {
    setLoading(true)
    if (!selectedClientId) { setRecords([]); setEquipment([]); setLoading(false); return }
    const tables = [['cameras', 'camera'], ['dvrs', 'dvr'], ['switches', 'switch'], ['power_baluns', 'balun'], ['routers', 'router'], ['monitors', 'monitor']] as const
    const [historyResult, ...equipmentResults] = await Promise.all([
      supabase.from('maintenance_records').select('*').eq('client_id', selectedClientId).order('performed_at', { ascending: false }),
      ...tables.map(([table]) => supabase.from(table).select('id,name').eq('client_id', selectedClientId).order('name')),
    ])
    if (historyResult.error) toast(`Erro ao carregar histórico: ${historyResult.error.message}`, 'error')
    setRecords((historyResult.data || []) as MaintenanceRecord[])
    setEquipment(equipmentResults.flatMap((result, index) => (result.data || []).map(item => ({ id: item.id as string, name: item.name as string, type: tables[index][1] }))))
    setLoading(false)
  }, [selectedClientId, toast])

  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => records.filter(record => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    const matchesSearch = !term || `${record.equipment_name} ${record.problem_found} ${record.service_performed} ${record.technician_name}`.toLocaleLowerCase('pt-BR').includes(term)
    return matchesSearch && (statusFilter === 'all' || record.result_status === statusFilter)
  }), [records, search, statusFilter])
  const resolved = records.filter(record => record.result_status === 'resolved').length
  const pending = records.length - resolved

  const save = async () => {
    if (!selectedClientId || !user) return
    const selected = equipment.find(item => `${item.type}:${item.id}` === form.equipmentKey)
    if (!selected || !form.problem.trim() || !form.service.trim() || !form.technician.trim()) { toast('Preencha equipamento, problema, serviço e técnico.', 'error'); return }
    setSaving(true)
    const insert = await supabase.from('maintenance_records').insert({ client_id: selectedClientId, equipment_type: selected.type, equipment_id: selected.id, equipment_name: selected.name, problem_found: form.problem.trim(), service_performed: form.service.trim(), replaced_part: form.part.trim() || null, technician_name: form.technician.trim(), result_status: form.status, performed_at: new Date(form.date).toISOString(), notes: form.notes.trim() || null, created_by: user.id }).select('id').single()
    if (insert.error) { setSaving(false); toast(insert.error.message, 'error'); return }
    const paths: string[] = []
    for (const file of files.slice(0, 4)) {
      const uploaded = await uploadMaintenanceMedia(file, user.id, insert.data.id, selectedClientId)
      if (uploaded.url) paths.push(uploaded.url)
      else toast(`Não foi possível enviar ${file.name}: ${uploaded.error}`, 'error')
    }
    if (paths.length) await supabase.from('maintenance_records').update({ evidence_paths: paths }).eq('id', insert.data.id)
    setSaving(false); setOpen(false); setForm(initialForm); setFiles([]); toast('Manutenção registrada com sucesso.'); await load()
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    const result = await supabase.from('maintenance_records').delete().eq('id', deleting.id)
    setSaving(false)
    if (result.error) { toast(result.error.message, 'error'); return }
    setDeleting(null); toast('Registro excluído.'); await load()
  }

  if (loading) return <LoadingSpinner />
  return <div className="space-y-5">
    <ClientFilterBanner />
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Histórico de manutenção</h1><p className="text-sm text-text-muted mt-1">Problemas, serviços, peças e evidências preservados por equipamento.</p></div><Button onClick={() => setOpen(true)} disabled={!selectedClientId}><Plus className="w-4 h-4" /> Registrar manutenção</Button></div>
    <div className="grid grid-cols-3 gap-3">{[{ label: 'Intervenções', value: records.length, icon: Wrench }, { label: 'Resolvidas', value: resolved, icon: CheckCircle2 }, { label: 'Com acompanhamento', value: pending, icon: AlertTriangle }].map(item => <div key={item.label} className="bg-bg-secondary border border-border-light rounded-xl p-3"><span className="text-[11px] text-text-muted flex items-center gap-2"><item.icon className="w-3.5 h-3.5" /> {item.label}</span><strong className="text-xl text-text-primary block mt-2">{item.value}</strong></div>)}</div>
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar equipamento, problema, serviço ou técnico..." className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary" /></div><Select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} options={[{ value: 'all', label: 'Todas as situações' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} /></div>
    {filtered.length === 0 ? <div className="bg-bg-secondary border border-dashed border-border-light rounded-xl py-12 text-center text-sm text-text-muted">Nenhuma manutenção encontrada.</div> : <div className="space-y-3">{filtered.map(record => <article key={record.id} className="bg-bg-secondary border border-border-light rounded-xl p-4"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-text-primary">{record.equipment_name}</strong><span className="text-[10px] rounded bg-bg-tertiary px-2 py-0.5 text-text-muted">{typeLabels[record.equipment_type] || record.equipment_type}</span><span className={`text-[10px] rounded px-2 py-0.5 ${statusClasses[record.result_status]}`}>{statusLabels[record.result_status]}</span></div><p className="text-xs text-text-muted mt-1 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {new Date(record.performed_at).toLocaleString('pt-BR')} · {record.technician_name}</p></div><Button variant="ghost" size="sm" onClick={() => setDeleting(record)}><Trash2 className="w-4 h-4 text-danger" /></Button></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4 text-sm"><div className="rounded-lg bg-danger/5 border border-danger/15 p-3"><span className="text-[10px] uppercase text-danger">Problema encontrado</span><p className="text-text-secondary mt-1 whitespace-pre-wrap">{record.problem_found}</p></div><div className="rounded-lg bg-success/5 border border-success/15 p-3"><span className="text-[10px] uppercase text-success">Serviço realizado</span><p className="text-text-secondary mt-1 whitespace-pre-wrap">{record.service_performed}</p></div></div>{(record.replaced_part || record.notes || record.evidence_paths.length > 0) && <div className="flex flex-wrap gap-3 mt-3 text-xs text-text-muted">{record.replaced_part && <span>Peça: <strong className="text-text-secondary">{record.replaced_part}</strong></span>}{record.notes && <span>Observação: <strong className="text-text-secondary">{record.notes}</strong></span>}{record.evidence_paths.length > 0 && <span className="flex items-center gap-1"><FileImage className="w-3.5 h-3.5" /> {record.evidence_paths.length} evidência(s)</span>}</div>}</article>)}</div>}
    <Modal open={open} onClose={() => setOpen(false)} title="Registrar manutenção" size="lg"><div className="space-y-4"><Select label="Equipamento" value={form.equipmentKey} onChange={event => setForm(current => ({ ...current, equipmentKey: event.target.value }))} placeholder="Selecione..." options={equipment.map(item => ({ value: `${item.type}:${item.id}`, label: `${typeLabels[item.type]} · ${item.name}` }))} /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Técnico responsável" value={form.technician} onChange={event => setForm(current => ({ ...current, technician: event.target.value }))} /><Input label="Data e hora" type="datetime-local" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></div><label className="block text-sm text-text-secondary">Problema encontrado<textarea value={form.problem} onChange={event => setForm(current => ({ ...current, problem: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-lg border border-border-light bg-bg-primary p-3 text-text-primary" /></label><label className="block text-sm text-text-secondary">Serviço realizado<textarea value={form.service} onChange={event => setForm(current => ({ ...current, service: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-lg border border-border-light bg-bg-primary p-3 text-text-primary" /></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Peça substituída (opcional)" value={form.part} onChange={event => setForm(current => ({ ...current, part: event.target.value }))} /><Select label="Situação posterior" value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></div><Input label="Observações" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /><div><label className="block text-sm font-medium text-text-secondary mb-1.5">Fotos ou vídeos — até 4 arquivos</label><input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={event => setFiles(Array.from(event.target.files || []).slice(0, 4))} className="block w-full text-sm text-text-muted" /><p className="text-xs text-text-muted mt-1">{files.length} arquivo(s) selecionado(s). Limite de 50 MB por arquivo.</p></div></div><div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button></div></Modal>
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => void remove()} title="Excluir registro" message="Excluir permanentemente este registro de manutenção?" loading={saving} />
  </div>
}
