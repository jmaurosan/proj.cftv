import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Download, Network, Pencil, Plus, Router, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import type { NetworkSegment } from '../lib/types'
import { findBestSegment, findDuplicateIps, getSegmentBounds, maskToPrefix, numberToIpv4, stripCidr, suggestNextIp, validateSegment, type IpDevice } from '../lib/ipPlanning'

interface InventoryRow { id: string; name: string; ip_address: string | null; status?: string | null }
type SegmentForm = Pick<NetworkSegment, 'name' | 'description' | 'network_ip' | 'subnet_mask' | 'gateway_ip' | 'vlan_id' | 'dhcp_start_ip' | 'dhcp_end_ip'>

const emptyForm: SegmentForm = { name: '', description: '', network_ip: '', subnet_mask: '255.255.255.0', gateway_ip: '', vlan_id: null, dhcp_start_ip: '', dhcp_end_ip: '' }
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

export default function IpPlanningPage() {
  const { user } = useAuth()
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()
  const [segments, setSegments] = useState<NetworkSegment[]>([])
  const [devices, setDevices] = useState<IpDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NetworkSegment | null>(null)
  const [deleting, setDeleting] = useState<NetworkSegment | null>(null)
  const [form, setForm] = useState<SegmentForm>(emptyForm)

  const loadData = useCallback(async () => {
    setLoading(true)
    if (!selectedClientId) { setSegments([]); setDevices([]); setLoading(false); return }
    const [segmentResult, dvrResult, cameraResult, switchResult, routerResult] = await Promise.all([
      supabase.from('network_segments').select('*').eq('client_id', selectedClientId).order('name'),
      supabase.from('dvrs').select('id,name,ip_address,status').eq('client_id', selectedClientId),
      supabase.from('cameras').select('id,name,ip_address,status').eq('client_id', selectedClientId),
      supabase.from('switches').select('id,name,ip_address,status').eq('client_id', selectedClientId),
      supabase.from('routers').select('id,name,ip_address,status').eq('client_id', selectedClientId),
    ])
    const firstError = [segmentResult, dvrResult, cameraResult, switchResult, routerResult].find(result => result.error)?.error
    if (firstError) toast(`Erro ao carregar o plano de IPs: ${firstError.message}`, 'error')
    setSegments((segmentResult.data || []) as NetworkSegment[])
    const mapRows = (rows: unknown[] | null, type: string): IpDevice[] => ((rows || []) as InventoryRow[])
      .filter(row => Boolean(row.ip_address?.trim()))
      .map(row => ({ id: `${type}-${row.id}`, name: row.name, type, ip: row.ip_address!, status: row.status || undefined }))
    setDevices([
      ...mapRows(dvrResult.data, 'DVR/NVR'), ...mapRows(cameraResult.data, 'Câmera'),
      ...mapRows(switchResult.data, 'Switch'), ...mapRows(routerResult.data, 'Roteador'),
    ])
    setLoading(false)
  }, [selectedClientId, toast])

  useEffect(() => { void loadData() }, [loadData])

  const duplicates = useMemo(() => findDuplicateIps(devices), [devices])
  const filteredDevices = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return devices
    return devices.filter(device => `${device.name} ${device.type} ${device.ip}`.toLocaleLowerCase('pt-BR').includes(term))
  }, [devices, search])
  const unassigned = devices.filter(device => !findBestSegment(segments, device.ip))

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  const openEdit = (segment: NetworkSegment) => {
    setEditing(segment)
    setForm({ name: segment.name, description: segment.description || '', network_ip: segment.network_ip || '', subnet_mask: segment.subnet_mask || '', gateway_ip: segment.gateway_ip || '', vlan_id: segment.vlan_id, dhcp_start_ip: segment.dhcp_start_ip || '', dhcp_end_ip: segment.dhcp_end_ip || '' })
    setFormOpen(true)
  }
  const updateForm = (field: keyof SegmentForm, value: string | number | null) => setForm(current => ({ ...current, [field]: value }))

  const saveSegment = async () => {
    if (!selectedClientId || !user) return
    if (!form.name.trim()) { toast('Informe o nome da sub-rede.', 'error'); return }
    const errors = validateSegment({ network_ip: form.network_ip, subnet_mask: form.subnet_mask, gateway_ip: form.gateway_ip, dhcp_start_ip: form.dhcp_start_ip, dhcp_end_ip: form.dhcp_end_ip })
    if (errors.length) { toast(errors[0], 'error'); return }
    setSaving(true)
    const payload = { ...form, name: form.name.trim(), description: form.description?.trim() || null, network_ip: stripCidr(form.network_ip || ''), gateway_ip: form.gateway_ip?.trim() || null, dhcp_start_ip: form.dhcp_start_ip?.trim() || null, dhcp_end_ip: form.dhcp_end_ip?.trim() || null, vlan_id: form.vlan_id || null, client_id: selectedClientId }
    const result = editing
      ? await supabase.from('network_segments').update(payload).eq('id', editing.id)
      : await supabase.from('network_segments').insert({ ...payload, user_id: user.id })
    setSaving(false)
    if (result.error) { toast(result.error.message, 'error'); return }
    toast(editing ? 'Sub-rede atualizada com sucesso.' : 'Sub-rede criada com sucesso.')
    setFormOpen(false)
    await loadData()
  }

  const deleteSegment = async () => {
    if (!deleting) return
    setSaving(true)
    const result = await supabase.from('network_segments').delete().eq('id', deleting.id)
    setSaving(false)
    if (result.error) { toast(result.error.message, 'error'); return }
    toast('Sub-rede excluída. Os equipamentos não foram apagados.')
    setDeleting(null)
    await loadData()
  }

  const copyIp = async (ip: string) => { await navigator.clipboard.writeText(ip); toast(`IP ${ip} copiado.`) }
  const exportCsv = () => {
    const header = ['Segmento', 'Tipo', 'Equipamento', 'IP', 'Status', 'Conflito']
    const rows = devices.map(device => {
      const segment = findBestSegment(segments, device.ip)
      return [segment ? (segments.find(item => item.id === segment.id)?.name || '') : 'Fora de segmento', device.type, device.name, stripCidr(device.ip), device.status || '', duplicates.has(stripCidr(device.ip)) ? 'Sim' : 'Não']
    })
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `plano-ips-${(selectedClientName || 'cliente').replace(/\s+/g, '-').toLowerCase()}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  if (loading) return <LoadingSpinner />

  return <div className="space-y-5">
    <ClientFilterBanner />
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div><h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> Plano de endereçamento IP</h1><p className="text-sm text-text-muted mt-1">Inventário consolidado, sub-redes, conflitos e reserva de endereços.</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={exportCsv} disabled={!devices.length}><Download className="w-4 h-4" /> Exportar CSV</Button><Button onClick={openCreate} disabled={!selectedClientId}><Plus className="w-4 h-4" /> Nova sub-rede</Button></div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[{ label: 'Equipamentos com IP', value: devices.length, icon: Network }, { label: 'Sub-redes cadastradas', value: segments.length, icon: Router }, { label: 'IPs em conflito', value: duplicates.size, icon: AlertTriangle }, { label: 'Fora de sub-rede', value: unassigned.length, icon: Search }].map(item => <div key={item.label} className="bg-bg-secondary border border-border-light rounded-xl p-3"><div className="flex items-center gap-2 text-[11px] text-text-muted"><item.icon className="w-3.5 h-3.5" /> {item.label}</div><p className="text-xl font-bold text-text-primary mt-2">{item.value}</p></div>)}
    </div>

    {duplicates.size > 0 && <section className="rounded-xl border border-danger/30 bg-danger/5 p-4"><h2 className="text-sm font-semibold text-danger flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Conflitos encontrados</h2><div className="mt-3 space-y-2">{[...duplicates].map(([ip, items]) => <div key={ip} className="rounded-lg bg-bg-secondary border border-danger/20 p-3 text-xs"><strong className="text-danger">{ip}</strong><span className="text-text-muted"> — {items.map(item => `${item.type}: ${item.name}`).join(' · ')}</span></div>)}</div></section>}

    <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar equipamento, tipo ou IP..." className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary" /></div>

    {segments.length === 0 ? <div className="bg-bg-secondary border border-dashed border-border-light rounded-xl py-12 text-center"><Network className="w-9 h-9 text-text-muted mx-auto mb-3" /><p className="text-sm text-text-secondary">Cadastre a primeira sub-rede para organizar os IPs automaticamente.</p></div> : <div className="space-y-4">{segments.map(segment => {
      const bounds = getSegmentBounds(segment)
      const members = filteredDevices.filter(device => findBestSegment(segments, device.ip)?.id === segment.id)
      const nextIp = suggestNextIp(segment, devices.map(device => device.ip))
      const capacity = bounds && bounds.prefix < 31 ? bounds.lastHost - bounds.firstHost + 1 : 0
      return <section key={segment.id} className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden">
        <div className="p-4 bg-bg-primary/30 border-b border-border-light flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><h2 className="font-semibold text-text-primary">{segment.name}</h2><p className="text-xs text-text-muted mt-1">{segment.network_ip}/{maskToPrefix(segment.subnet_mask || '') ?? '?'} · máscara {segment.subnet_mask || '-'}{segment.vlan_id ? ` · VLAN ${segment.vlan_id}` : ''}</p></div><div className="flex flex-wrap items-center gap-2">{nextIp && <button onClick={() => void copyIp(nextIp)} className="inline-flex items-center gap-1.5 rounded-lg border border-success/25 bg-success/5 px-2.5 py-1.5 text-xs text-success"><Copy className="w-3.5 h-3.5" /> Próximo estático: {nextIp}</button>}<Button variant="ghost" size="sm" onClick={() => openEdit(segment)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="sm" onClick={() => setDeleting(segment)}><Trash2 className="w-4 h-4 text-danger" /></Button></div></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 text-xs"><div><span className="text-text-muted block">Gateway</span><strong className="text-text-primary">{segment.gateway_ip || '-'}</strong></div><div><span className="text-text-muted block">Faixa DHCP</span><strong className="text-text-primary">{segment.dhcp_start_ip && segment.dhcp_end_ip ? `${segment.dhcp_start_ip} — ${segment.dhcp_end_ip}` : 'Não definida'}</strong></div><div><span className="text-text-muted block">Endereços utilizáveis</span><strong className="text-text-primary">{capacity.toLocaleString('pt-BR')}</strong></div><div><span className="text-text-muted block">Equipamentos encontrados</span><strong className="text-primary">{members.length}</strong></div></div>
        {members.length === 0 ? <p className="px-4 pb-4 text-xs text-text-muted">Nenhum equipamento desta busca pertence à sub-rede.</p> : <div className="border-t border-border-light divide-y divide-border-light/50">{members.map(device => { const conflict = duplicates.has(stripCidr(device.ip)); return <div key={device.id} className="p-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_0.6fr_0.7fr_auto] gap-2 items-center text-xs"><strong className="text-text-primary">{device.name}</strong><span className="text-text-muted">{device.type}</span><code className={conflict ? 'text-danger' : 'text-text-secondary'}>{stripCidr(device.ip)}</code>{conflict ? <AlertTriangle className="w-4 h-4 text-danger" /> : <CheckCircle2 className="w-4 h-4 text-success" />}</div>})}</div>}
      </section>
    })}</div>}

    {unassigned.length > 0 && <section className="bg-warning/5 border border-warning/30 rounded-xl p-4"><h2 className="text-sm font-semibold text-warning">Equipamentos fora das sub-redes cadastradas</h2><div className="mt-3 flex flex-wrap gap-2">{unassigned.filter(device => filteredDevices.some(item => item.id === device.id)).map(device => <span key={device.id} className="rounded-lg border border-warning/20 bg-bg-secondary px-2.5 py-1.5 text-xs text-text-secondary">{device.name} · {stripCidr(device.ip)}</span>)}</div></section>}

    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar sub-rede' : 'Nova sub-rede'} size="lg"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="sm:col-span-2"><Input label="Nome" value={form.name} onChange={event => updateForm('name', event.target.value)} placeholder="Ex.: CFTV principal" /></div><Input label="Endereço da rede" value={form.network_ip || ''} onChange={event => updateForm('network_ip', event.target.value)} placeholder="192.168.0.0" /><Input label="Máscara" value={form.subnet_mask || ''} onChange={event => updateForm('subnet_mask', event.target.value)} placeholder="255.255.255.0" /><Input label="Gateway" value={form.gateway_ip || ''} onChange={event => updateForm('gateway_ip', event.target.value)} placeholder="192.168.0.1" /><Input label="VLAN (opcional)" type="number" min="1" max="4094" value={form.vlan_id || ''} onChange={event => updateForm('vlan_id', event.target.value ? Number(event.target.value) : null)} /><Input label="Início da faixa DHCP" value={form.dhcp_start_ip || ''} onChange={event => updateForm('dhcp_start_ip', event.target.value)} placeholder="192.168.0.100" /><Input label="Fim da faixa DHCP" value={form.dhcp_end_ip || ''} onChange={event => updateForm('dhcp_end_ip', event.target.value)} placeholder="192.168.0.200" /><div className="sm:col-span-2"><Input label="Descrição (opcional)" value={form.description || ''} onChange={event => updateForm('description', event.target.value)} /></div></div><div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button><Button onClick={() => void saveSegment()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar sub-rede'}</Button></div></Modal>
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => void deleteSegment()} title="Excluir sub-rede" message={`Excluir “${deleting?.name || ''}”? Os equipamentos e seus endereços IP serão preservados.`} loading={saving} />
  </div>
}
