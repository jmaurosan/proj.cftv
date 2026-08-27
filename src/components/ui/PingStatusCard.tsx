import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import Button from './Button'

export type DiagnosticAccessMode = 'local' | 'wireguard'

export interface PingDevice {
  id: string
  name: string
  type: 'DVR' | 'Switch' | 'Roteador' | 'Câmera'
  ip: string
}

export interface PingResult {
  deviceId: string
  online: boolean
  latency: number
  tested: boolean
  reason?: string
}

interface PingStatusCardProps {
  devices: PingDevice[]
  agentUrl: string
  agentToken: string
  accessMode: DiagnosticAccessMode
  agentOnline: boolean
  onComplete?: (results: Record<string, PingResult>) => void | Promise<void>
}

export default function PingStatusCard({ devices, agentUrl, agentToken, accessMode, agentOnline, onComplete }: PingStatusCardProps) {
  const [results, setResults] = useState<Record<string, PingResult>>({})
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [testedAt, setTestedAt] = useState<Date | null>(null)

  useEffect(() => {
    setResults({})
    setProgress(0)
    setTestedAt(null)
  }, [devices, accessMode])

  const probe = async (device: PingDevice): Promise<PingResult> => {
    const response = await fetch(`${agentUrl.replace(/\/+$/, '')}/network/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cftv-agent-token': agentToken.trim() },
      body: JSON.stringify({ ip: device.ip }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'O agente não conseguiu executar o ping.')
    return {
      deviceId: device.id,
      online: Boolean(payload.online),
      latency: Number(payload.latency || 0),
      tested: true,
      reason: payload.online ? 'Resposta ICMP recebida pelo agente.' : 'Sem resposta ICMP no tempo limite.',
    }
  }

  const runAllTests = async () => {
    if (testing || !agentOnline || !agentToken.trim() || devices.length === 0) return
    setTesting(true)
    setProgress(0)
    const next: Record<string, PingResult> = {}

    for (let index = 0; index < devices.length; index += 4) {
      const batch = devices.slice(index, index + 4)
      await Promise.all(batch.map(async (device) => {
        try {
          next[device.id] = await probe(device)
        } catch (error) {
          next[device.id] = {
            deviceId: device.id,
            online: false,
            latency: 0,
            tested: true,
            reason: error instanceof Error ? error.message : 'Falha ao consultar o agente.',
          }
        }
        setResults({ ...next })
        setProgress(Math.round((Object.keys(next).length / devices.length) * 100))
      }))
    }

    setTesting(false)
    setTestedAt(new Date())
    await onComplete?.(next)
  }

  const testedResults = Object.values(results)
  const onlineCount = testedResults.filter(result => result.online).length
  const offlineCount = testedResults.filter(result => !result.online).length

  return (
    <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Equipamentos com endereço IP</h3>
          <p className="text-xs text-text-muted mt-1">O ping ICMP será executado pelo computador onde o agente local está rodando.</p>
        </div>
        <Button onClick={runAllTests} disabled={testing || !agentOnline || !agentToken.trim()} size="sm" className="flex items-center gap-1.5">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {testing ? `Testando (${progress}%)` : 'Testar conexões'}
        </Button>
      </div>

      {!agentOnline && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 flex items-start gap-2 text-xs text-warning">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Agente indisponível. Nenhum equipamento será marcado como offline. Inicie o agente em um PC conectado à rede do cliente ou ao WireGuard.</span>
        </div>
      )}

      {testedAt && (
        <div className="rounded-lg border border-border-light bg-bg-primary/40 px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span><strong className="text-success">{onlineCount} on-line</strong> · <strong className="text-danger">{offlineCount} sem resposta</strong></span>
          <span className="text-text-muted">{accessMode === 'wireguard' ? 'WireGuard/VPN' : 'Rede local'} · {testedAt.toLocaleString('pt-BR')}</span>
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">Nenhum equipamento com IP cadastrado neste cliente.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {devices.map(device => {
            const result = results[device.id]
            return (
              <div key={device.id} title={result?.reason} className={`p-3 rounded-lg border text-xs flex items-center justify-between ${!result ? 'bg-bg-primary/40 border-border-light/30' : result.online ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-text-primary truncate">{device.name}</div>
                  <div className="text-[10px] text-text-muted mt-0.5 font-mono">{device.type} · {device.ip}</div>
                </div>
                {!result ? <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" /> : result.online ? (
                  <span className="flex items-center gap-1 text-success shrink-0"><CheckCircle2 className="w-4 h-4" /> {result.latency}ms</span>
                ) : (
                  <span className="flex items-center gap-1 text-danger shrink-0"><AlertCircle className="w-4 h-4" /> sem resposta</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
