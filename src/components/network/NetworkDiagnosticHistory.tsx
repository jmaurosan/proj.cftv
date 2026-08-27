import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Clock3, History, RefreshCw, ShieldCheck, Trash2, Wifi } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

interface StoredDeviceResult {
  id: string
  name: string
  type: string
  ip: string
  result: { online: boolean; latency: number; reason?: string } | null
}

interface DiagnosticRow {
  id: string
  access_mode: 'local' | 'wireguard'
  agent_hostname: string | null
  total_devices: number
  online_devices: number
  offline_devices: number
  results: StoredDeviceResult[]
  created_at: string
}

interface NetworkDiagnosticHistoryProps {
  clientId: string | null
  refreshKey: number
}

export default function NetworkDiagnosticHistory({ clientId, refreshKey }: NetworkDiagnosticHistoryProps) {
  const { toast } = useToast()
  const [rows, setRows] = useState<DiagnosticRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!clientId) {
      setRows([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('network_diagnostics')
      .select('id,access_mode,agent_hostname,total_devices,online_devices,offline_devices,results,created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) toast('Não foi possível carregar o histórico de diagnósticos.', 'error')
    else setRows((data || []) as DiagnosticRow[])
    setLoading(false)
  }, [clientId, toast])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory, refreshKey])

  const deleteDiagnostic = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('network_diagnostics').delete().eq('id', deleteId)
    if (error) toast('Seu perfil não permite excluir este diagnóstico.', 'error')
    else {
      toast('Diagnóstico removido do histórico.', 'success')
      setRows(current => current.filter(row => row.id !== deleteId))
      if (expandedId === deleteId) setExpandedId(null)
    }
    setDeleteId(null)
  }

  return (
    <section className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Histórico de diagnósticos</h2>
          <p className="text-xs text-text-muted mt-1">Últimas 30 execuções registradas para o cliente selecionado.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void loadHistory()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {!clientId ? (
        <p className="text-sm text-text-muted text-center py-8">Selecione um cliente para consultar o histórico.</p>
      ) : rows.length === 0 && !loading ? (
        <p className="text-sm text-text-muted text-center py-8">Nenhum diagnóstico registrado para este cliente.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => {
            const expanded = expandedId === row.id
            const successRate = row.total_devices > 0 ? Math.round((row.online_devices / row.total_devices) * 100) : 0
            return (
              <div key={row.id} className="rounded-lg border border-border-light overflow-hidden">
                <div className="p-3 bg-bg-primary/35 flex flex-col lg:flex-row lg:items-center gap-3">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : row.id)} className="flex-1 min-w-0 text-left grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-2 sm:items-center">
                    <span className="text-xs text-text-primary flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 text-text-muted" /> {new Date(row.created_at).toLocaleString('pt-BR')}</span>
                    <span className="text-xs text-text-secondary flex items-center gap-2">{row.access_mode === 'wireguard' ? <ShieldCheck className="w-3.5 h-3.5 text-primary" /> : <Wifi className="w-3.5 h-3.5 text-primary" />}{row.access_mode === 'wireguard' ? 'WireGuard/VPN' : 'Rede local'}</span>
                    <span className="text-xs text-text-muted truncate">{row.agent_hostname || 'PC não identificado'}</span>
                    <span className="flex items-center gap-2 text-xs whitespace-nowrap"><strong className="text-success">{row.online_devices} on-line</strong><span className="text-danger">{row.offline_devices} sem resposta</span>{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                  </button>
                  <button type="button" onClick={() => setDeleteId(row.id)} className="self-end lg:self-auto p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10" title="Excluir diagnóstico"><Trash2 className="w-4 h-4" /></button>
                </div>

                {expanded && (
                  <div className="p-3 space-y-3">
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden"><div className="h-full bg-success" style={{ width: `${successRate}%` }} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {(Array.isArray(row.results) ? row.results : []).map(device => (
                        <div key={`${row.id}-${device.id}`} className={`rounded-md border p-2.5 text-xs ${device.result?.online ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}`}>
                          <div className="flex items-center justify-between gap-2"><strong className="text-text-primary truncate">{device.name}</strong><span className={device.result?.online ? 'text-success' : 'text-danger'}>{device.result?.online ? `${device.result.latency}ms` : 'sem resposta'}</span></div>
                          <div className="text-[10px] text-text-muted mt-1 font-mono">{device.type} · {device.ip}</div>
                          {device.result?.reason && <div className="text-[10px] text-text-muted mt-1">{device.result.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir diagnóstico"
        message="Deseja remover permanentemente este registro do histórico?"
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={() => void deleteDiagnostic()}
        onClose={() => setDeleteId(null)}
      />
    </section>
  )
}
