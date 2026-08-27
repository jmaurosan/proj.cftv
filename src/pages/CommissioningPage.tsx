import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ClipboardCheck, Clock3, FileDown, History, Paperclip, Pencil, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  COMMISSIONING_MEDIA_LIMIT,
  deleteCommissioningMedia,
  getCommissioningMediaUrl,
  uploadCommissioningMedia,
} from '../services/commissioningMediaService'

type EquipmentType = 'camera' | 'dvr' | 'switch' | 'balun' | 'router' | 'monitor'
type CommissioningStatus = 'draft' | 'approved' | 'attention' | 'failed'

interface EquipmentOption { id: string; name: string; type: EquipmentType }
interface EquipmentLog {
  id: string
  equipment_type: EquipmentType
  equipment_id: string | null
  equipment_name: string | null
  action: string
  changed_fields: string[] | null
  previous_data: Record<string, unknown> | null
  current_data: Record<string, unknown> | null
  created_at: string
}
interface Commissioning {
  id: string
  equipment_type: EquipmentType
  equipment_id: string
  status: CommissioningStatus
  checklist: Record<string, boolean>
  measurements: Record<string, string>
  notes: string | null
  tested_at: string | null
  created_at: string
}
interface CommissioningMedia {
  id: string
  commissioning_id: string
  storage_path: string
  file_name: string
  media_type: 'image' | 'video'
  mime_type: string | null
  size_bytes: number
  created_at: string
}
interface TechnicalIssue {
  id: string
  commissioning_id: string | null
  equipment_type: EquipmentType
  equipment_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
}

const TYPE_LABELS: Record<EquipmentType, string> = {
  camera: 'Câmera', dvr: 'DVR/NVR', switch: 'Switch', balun: 'Power Balun', router: 'Roteador', monitor: 'Monitor',
}
const STATUS_LABELS: Record<CommissioningStatus, string> = {
  draft: 'Rascunho', approved: 'Aprovado', attention: 'Requer atenção', failed: 'Reprovado',
}
const CHECKLISTS: Record<EquipmentType, string[]> = {
  camera: ['Imagem diurna', 'Imagem noturna/IR', 'Ângulo e enquadramento', 'Foco e nitidez', 'Gravação no DVR/NVR', 'Acesso pela rede', 'Alimentação', 'Identificação física'],
  dvr: ['Canais on-line', 'Data e hora', 'Gravação contínua/evento', 'Reprodução', 'Saúde dos discos', 'Acesso remoto/VPN', 'Backup de configuração'],
  switch: ['Portas identificadas', 'Link das portas', 'PoE por porta', 'Orçamento PoE', 'Uplink', 'Acesso de gerenciamento', 'Backup de configuração'],
  balun: ['Portas identificadas', 'Vídeo sem interferência', 'Tensão de saída', 'Conectores', 'Fonte de alimentação', 'Ventilação'],
  router: ['Internet principal', 'Failover', 'VPN/WireGuard', 'Rotas da rede CFTV', 'DNS e horário', 'Backup de configuração'],
  monitor: ['Imagem', 'Resolução', 'Entradas de vídeo', 'Alimentação', 'Fixação e cabos'],
}
const FIELD_LABELS: Record<string, string> = {
  name: 'nome', dvr_id: 'DVR', channel_number: 'canal', balun_id: 'Power Balun', balun_port: 'porta do Balun',
  switch_id: 'switch', switch_port: 'porta do switch', ip_address: 'IP', location: 'localização', status: 'status',
  connection_type: 'tipo de conexão', model: 'modelo', brand: 'marca', updated_at: 'data de atualização',
}

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Não concluído'

export default function CommissioningPage() {
  const { selectedClientId, selectedClientName } = useClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'commissioning' | 'issues' | 'history'>('commissioning')
  const [equipment, setEquipment] = useState<EquipmentOption[]>([])
  const [logs, setLogs] = useState<EquipmentLog[]>([])
  const [records, setRecords] = useState<Commissioning[]>([])
  const [media, setMedia] = useState<CommissioningMedia[]>([])
  const [issues, setIssues] = useState<TechnicalIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<EquipmentType>('camera')
  const [equipmentId, setEquipmentId] = useState('')
  const [status, setStatus] = useState<CommissioningStatus>('draft')
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [voltage, setVoltage] = useState('')
  const [current, setCurrent] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Commissioning | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const fetchData = useCallback(async () => {
    if (!selectedClientId) {
      setEquipment([]); setLogs([]); setRecords([]); setMedia([]); setIssues([]); setLoading(false); return
    }
    setLoading(true)
    const [cameras, dvrs, switches, baluns, routers, monitors, logsResult, recordsResult, mediaResult, issuesResult] = await Promise.all([
      supabase.from('cameras').select('id,name').eq('client_id', selectedClientId).order('name'),
      supabase.from('dvrs').select('id,name').eq('client_id', selectedClientId).order('name'),
      supabase.from('switches').select('id,name').eq('client_id', selectedClientId).order('name'),
      supabase.from('power_baluns').select('id,name').eq('client_id', selectedClientId).order('name'),
      supabase.from('routers').select('id,name').eq('client_id', selectedClientId).order('name'),
      supabase.from('monitors').select('id,name').eq('client_id', selectedClientId).order('name'),
      supabase.from('equipment_logs').select('id,equipment_type,equipment_id,equipment_name,action,changed_fields,previous_data,current_data,created_at').eq('client_id', selectedClientId).order('created_at', { ascending: false }).limit(200),
      supabase.from('equipment_commissioning').select('id,equipment_type,equipment_id,status,checklist,measurements,notes,tested_at,created_at').eq('client_id', selectedClientId).order('created_at', { ascending: false }),
      supabase.from('commissioning_media').select('id,commissioning_id,storage_path,file_name,media_type,mime_type,size_bytes,created_at').eq('client_id', selectedClientId).order('created_at'),
      supabase.from('technical_issues').select('id,commissioning_id,equipment_type,equipment_id,title,description,priority,status,created_at,resolved_at').eq('client_id', selectedClientId).order('created_at', { ascending: false }),
    ])
    const collect = (result: { data: { id: string; name: string }[] | null }, itemType: EquipmentType) =>
      (result.data ?? []).map((item) => ({ ...item, type: itemType }))
    setEquipment([
      ...collect(cameras, 'camera'), ...collect(dvrs, 'dvr'), ...collect(switches, 'switch'),
      ...collect(baluns, 'balun'), ...collect(routers, 'router'), ...collect(monitors, 'monitor'),
    ])
    setLogs((logsResult.data as EquipmentLog[] | null) ?? [])
    setRecords((recordsResult.data as Commissioning[] | null) ?? [])
    setMedia((mediaResult.data as CommissioningMedia[] | null) ?? [])
    setIssues((issuesResult.data as TechnicalIssue[] | null) ?? [])
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetchData() }, [fetchData])

  const equipmentById = useMemo(() => new Map(equipment.map((item) => [item.id, item])), [equipment])
  const typeEquipment = equipment.filter((item) => item.type === type)
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filteredRecords = records.filter((record) => {
    const item = equipmentById.get(record.equipment_id)
    return !normalizedSearch || `${item?.name ?? ''} ${TYPE_LABELS[record.equipment_type]} ${STATUS_LABELS[record.status]}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
  })
  const filteredLogs = logs.filter((log) => !normalizedSearch || `${log.equipment_name ?? ''} ${TYPE_LABELS[log.equipment_type] ?? log.equipment_type} ${(log.changed_fields ?? []).join(' ')}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
  const filteredIssues = issues.filter((issue) => {
    const item = equipmentById.get(issue.equipment_id)
    return !normalizedSearch || `${item?.name ?? ''} ${issue.title} ${issue.description ?? ''} ${issue.status}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
  })
  const mediaFor = (commissioningId: string) => media.filter((item) => item.commissioning_id === commissioningId)

  const openNew = () => {
    setEditingRecord(null); setType('camera'); setEquipmentId(''); setStatus('draft'); setChecks({}); setVoltage(''); setCurrent(''); setNotes(''); setSelectedFiles([]); setModalOpen(true)
  }
  const openEdit = (record: Commissioning) => {
    setEditingRecord(record)
    setType(record.equipment_type)
    setEquipmentId(record.equipment_id)
    setStatus(record.status)
    setChecks(record.checklist ?? {})
    setVoltage(record.measurements?.voltage ?? '')
    setCurrent(record.measurements?.current ?? '')
    setNotes(record.notes ?? '')
    setSelectedFiles([])
    setModalOpen(true)
  }
  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedClientId || !equipmentId || !user) return
    setSaving(true)
    const payload = {
      client_id: selectedClientId,
      equipment_type: type,
      equipment_id: equipmentId,
      status,
      checklist: checks,
      measurements: { voltage, current },
      notes: notes || null,
      tested_at: status === 'draft' ? null : new Date().toISOString(),
      tested_by: status === 'draft' ? null : user.id,
      updated_at: new Date().toISOString(),
    }
    const saveQuery = editingRecord
      ? supabase.from('equipment_commissioning').update(payload).eq('id', editingRecord.id).select('id').single()
      : supabase.from('equipment_commissioning').insert(payload).select('id').single()
    const { data: savedRecord, error } = await saveQuery
    if (!error && savedRecord?.id) {
      const existingCount = mediaFor(savedRecord.id).length
      const files = selectedFiles.slice(0, Math.max(0, COMMISSIONING_MEDIA_LIMIT - existingCount))
      for (const file of files) {
        const uploaded = await uploadCommissioningMedia({ file, clientId: selectedClientId, userId: user.id, commissioningId: savedRecord.id })
        if (uploaded.error) {
          setSaving(false)
          toast(`Registro salvo, mas uma mídia falhou: ${uploaded.error}`, 'error')
          await fetchData()
          return
        }
      }
    }
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast(editingRecord ? 'Comissionamento atualizado com sucesso' : 'Comissionamento registrado com sucesso')
    setModalOpen(false)
    await fetchData()
  }

  const handleDeleteMedia = async (item: CommissioningMedia) => {
    const error = await deleteCommissioningMedia(item.id, item.storage_path)
    if (error) { toast(error, 'error'); return }
    setMedia((currentMedia) => currentMedia.filter((mediaItem) => mediaItem.id !== item.id))
    toast('Mídia removida')
  }

  const resolveIssue = async (issue: TechnicalIssue) => {
    if (!user) return
    const { error } = await supabase.from('technical_issues').update({
      status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', issue.id)
    if (error) { toast(error.message, 'error'); return }
    toast('Pendência encerrada')
    await fetchData()
  }

  const generatePdf = async (record: Commissioning) => {
    const item = equipmentById.get(record.equipment_id)
    const doc = new jsPDF()
    doc.setFontSize(18); doc.text('Relatório de Comissionamento CFTV', 14, 18)
    doc.setFontSize(10)
    const lines = [
      `Condomínio/Projeto: ${selectedClientName ?? '-'}`,
      `Equipamento: ${item?.name ?? 'Equipamento removido'} (${TYPE_LABELS[record.equipment_type]})`,
      `Resultado: ${STATUS_LABELS[record.status]}`,
      `Data: ${formatDate(record.tested_at ?? record.created_at)}`,
      `Técnico: ${user?.email ?? user?.id ?? '-'}`,
      `Tensão medida: ${record.measurements?.voltage || '-'} V`,
      `Corrente medida: ${record.measurements?.current || '-'} A`,
    ]
    let y = 28
    lines.forEach((line) => { doc.text(line, 14, y); y += 6 })
    doc.setFontSize(12); doc.text('Checklist', 14, y + 3); y += 10
    doc.setFontSize(10)
    Object.entries(record.checklist ?? {}).forEach(([label, value]) => { doc.text(`${value ? '[OK]' : '[  ]'} ${label}`, 16, y); y += 6 })
    if (record.notes) { y += 3; doc.setFontSize(12); doc.text('Observações', 14, y); y += 7; doc.setFontSize(10); const wrapped = doc.splitTextToSize(record.notes, 180); doc.text(wrapped, 14, y); y += wrapped.length * 5 }
    const recordMedia = mediaFor(record.id)
    for (const mediaItem of recordMedia) {
      if (mediaItem.media_type !== 'image') continue
      const signedUrl = await getCommissioningMediaUrl(mediaItem.storage_path)
      if (!signedUrl) continue
      try {
        const blob = await fetch(signedUrl).then((response) => response.blob())
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob) })
        const imageFormat = mediaItem.mime_type === 'image/png' ? 'PNG' : 'JPEG'
        doc.addPage(); doc.setFontSize(11); doc.text(`Anexo: ${mediaItem.file_name}`, 14, 16); doc.addImage(dataUrl, imageFormat, 14, 24, 180, 135)
      } catch { /* Mantém o relatório mesmo se uma imagem não puder ser carregada. */ }
    }
    const videos = recordMedia.filter((mediaItem) => mediaItem.media_type === 'video')
    if (videos.length > 0) { doc.addPage(); doc.setFontSize(12); doc.text('Vídeos anexados', 14, 18); doc.setFontSize(10); videos.forEach((video, index) => doc.text(`${index + 1}. ${video.file_name}`, 16, 28 + index * 7)) }
    doc.save(`comissionamento-${(item?.name ?? record.id).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Comissionamento e Histórico</h1>
          <p className="mt-1 text-sm text-text-muted">Registre testes técnicos e acompanhe todas as alterações dos equipamentos.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo comissionamento</Button>
      </div>

      <div className="flex gap-2 border-b border-border-light">
        <button onClick={() => setActiveTab('commissioning')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'commissioning' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}`}><ClipboardCheck className="mr-2 inline h-4 w-4" />Comissionamentos</button>
        <button onClick={() => setActiveTab('issues')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'issues' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}`}><TriangleAlert className="mr-2 inline h-4 w-4" />Pendências ({issues.filter((issue) => issue.status === 'open').length})</button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}`}><History className="mr-2 inline h-4 w-4" />Histórico automático</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipamento, status ou campo alterado..." className="w-full rounded-lg border border-border-light bg-bg-secondary py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-accent" />
      </div>

      {activeTab === 'commissioning' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredRecords.map((record) => {
            const item = equipmentById.get(record.equipment_id)
            const checked = Object.values(record.checklist ?? {}).filter(Boolean).length
            const total = Object.keys(record.checklist ?? {}).length
            return <article key={record.id} className="rounded-xl border border-border-light bg-bg-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold text-text-primary">{item?.name ?? 'Equipamento removido'}</p><p className="text-xs text-text-muted">{TYPE_LABELS[record.equipment_type]} · {formatDate(record.tested_at ?? record.created_at)}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.status === 'approved' ? 'bg-success/15 text-success' : record.status === 'failed' ? 'bg-danger/15 text-danger' : record.status === 'attention' ? 'bg-warning/15 text-warning' : 'bg-bg-tertiary text-text-muted'}`}>{STATUS_LABELS[record.status]}</span>
              </div>
              <div className="mt-3 text-sm text-text-secondary">Checklist: <strong>{checked}/{total}</strong></div>
              {record.notes && <p className="mt-2 text-sm text-text-muted">{record.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-light pt-3">
                <span className="inline-flex items-center gap-1 text-xs text-text-muted"><Paperclip className="h-3.5 w-3.5" />{mediaFor(record.id).length}/{COMMISSIONING_MEDIA_LIMIT} mídias</span>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openEdit(record)}><Pencil className="h-3.5 w-3.5" />Editar</Button><Button size="sm" variant="secondary" onClick={() => generatePdf(record)}><FileDown className="h-3.5 w-3.5" />PDF</Button></div>
              </div>
            </article>
          })}
          {filteredRecords.length === 0 && <p className="text-sm text-text-muted">Nenhum comissionamento encontrado.</p>}
        </div>
      ) : activeTab === 'issues' ? (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const item = equipmentById.get(issue.equipment_id)
            return <article key={issue.id} className={`rounded-xl border p-4 ${issue.status === 'open' ? 'border-warning/30 bg-warning/5' : 'border-border-light bg-bg-secondary'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-text-primary">{item?.name ?? 'Equipamento removido'}</p><span className={`rounded-full px-2 py-0.5 text-xs ${issue.priority === 'high' || issue.priority === 'critical' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>{issue.priority === 'high' ? 'Alta' : issue.priority === 'critical' ? 'Crítica' : 'Média'}</span></div><p className="mt-1 text-sm text-text-secondary">{issue.title}</p>{issue.description && <p className="mt-1 text-sm text-text-muted">{issue.description}</p>}<p className="mt-2 text-xs text-text-muted">Aberta em {formatDate(issue.created_at)}{issue.resolved_at ? ` · encerrada em ${formatDate(issue.resolved_at)}` : ''}</p></div>
                {issue.status === 'open' ? <Button size="sm" onClick={() => resolveIssue(issue)}><CheckCircle2 className="h-4 w-4" />Encerrar pendência</Button> : <span className="text-sm text-success">Resolvida</span>}
              </div>
            </article>
          })}
          {filteredIssues.length === 0 && <p className="text-sm text-text-muted">Nenhuma pendência encontrada.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => <article key={log.id} className="rounded-xl border border-border-light bg-bg-secondary p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-accent/10 p-2">{log.action.includes('delete') ? <TriangleAlert className="h-4 w-4 text-warning" /> : <Clock3 className="h-4 w-4 text-accent" />}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-text-primary">{log.equipment_name ?? 'Equipamento'} <span className="text-xs font-normal text-text-muted">· {TYPE_LABELS[log.equipment_type] ?? log.equipment_type}</span></p><time className="text-xs text-text-muted">{formatDate(log.created_at)}</time></div>
              <p className="mt-1 text-sm text-text-secondary">{log.action.includes('insert') || log.action === 'created' ? 'Cadastro criado' : log.action.includes('delete') ? 'Cadastro removido' : `Alterado: ${(log.changed_fields ?? []).filter((field) => field !== 'updated_at').map((field) => FIELD_LABELS[field] ?? field).join(', ') || 'dados do equipamento'}`}</p></div>
            </div>
          </article>)}
          {filteredLogs.length === 0 && <p className="text-sm text-text-muted">Nenhuma alteração encontrada.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingRecord ? 'Editar comissionamento' : 'Novo comissionamento'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo de equipamento" value={type} onChange={(event) => { setType(event.target.value as EquipmentType); setEquipmentId(''); setChecks({}) }} options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="Equipamento" value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)} options={typeEquipment.map((item) => ({ value: item.id, label: item.name }))} placeholder="Selecione" required />
          </div>
          <div className="rounded-lg border border-border-light p-4"><p className="mb-3 text-sm font-semibold text-text-primary">Checklist técnico</p><div className="grid gap-2 sm:grid-cols-2">{CHECKLISTS[type].map((item) => <label key={item} className="flex cursor-pointer items-center gap-2 rounded-lg bg-bg-tertiary/40 px-3 py-2 text-sm text-text-secondary"><input type="checkbox" checked={Boolean(checks[item])} onChange={(event) => setChecks((currentChecks) => ({ ...currentChecks, [item]: event.target.checked }))} className="accent-cyan-500" />{item}</label>)}</div></div>
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Tensão medida (V)" value={voltage} onChange={(event) => setVoltage(event.target.value)} placeholder="Ex: 12,1" /><Input label="Corrente medida (A)" value={current} onChange={(event) => setCurrent(event.target.value)} placeholder="Ex: 0,45" /></div>
          <Select label="Resultado" value={status} onChange={(event) => setStatus(event.target.value as CommissioningStatus)} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
          <div><label className="mb-1.5 block text-sm font-medium text-text-secondary">Observações</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-lg border border-border-light bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" /></div>
          <div className="rounded-lg border border-border-light p-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-text-primary">Fotos e vídeos</p><p className="text-xs text-text-muted">Até {COMMISSIONING_MEDIA_LIMIT} mídias, com no máximo 50 MB cada.</p></div><span className="text-xs text-text-muted">{(editingRecord ? mediaFor(editingRecord.id).length : 0) + selectedFiles.length}/{COMMISSIONING_MEDIA_LIMIT}</span></div>
            {editingRecord && mediaFor(editingRecord.id).length > 0 && <div className="mt-3 space-y-2">{mediaFor(editingRecord.id).map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg bg-bg-tertiary/50 px-3 py-2 text-sm text-text-secondary"><span className="truncate">{item.media_type === 'video' ? 'Vídeo' : 'Foto'} · {item.file_name}</span><button type="button" onClick={() => handleDeleteMedia(item)} className="p-1 text-text-muted hover:text-danger" title="Remover mídia"><X className="h-4 w-4" /></button></div>)}</div>}
            {selectedFiles.length > 0 && <div className="mt-3 space-y-2">{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-accent/5 px-3 py-2 text-sm text-text-secondary"><span className="truncate">Nova · {file.name}</span><button type="button" onClick={() => setSelectedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))} className="p-1 text-text-muted hover:text-danger"><X className="h-4 w-4" /></button></div>)}</div>}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="mt-3 block w-full text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-2 file:text-accent" onChange={(event) => { const existingCount = editingRecord ? mediaFor(editingRecord.id).length : 0; const available = Math.max(0, COMMISSIONING_MEDIA_LIMIT - existingCount); setSelectedFiles(Array.from(event.target.files ?? []).slice(0, available)); event.target.value = '' }} />
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={!equipmentId || saving}><CheckCircle2 className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar'}</Button></div>
        </form>
      </Modal>
    </div>
  )
}
