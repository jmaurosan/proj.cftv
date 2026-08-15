import { useState, useEffect } from 'react'
import { Wifi, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import Button from './Button'

type PingStatus = 'online' | 'offline' | 'unverified'

interface PingDevice {
  id: string
  name: string
  type: 'DVR' | 'Switch' | 'Roteador' | 'Câmera'
  ip: string
}

export interface PingResult {
  deviceId: string
  online: boolean
  status?: PingStatus
  latency: number
  tested: boolean
  reason?: string
}

interface PingStatusCardProps {
  devices: PingDevice[]
  onResultsChange?: (results: Record<string, PingResult>) => void
}

const buildProbeTargets = (ip: string) => {
  const target = ip.trim()
  if (!target) return []
  if (/^https?:\/\//i.test(target)) return [target]
  return [`http://${target}`, `http://${target}/`, `http://${target}/favicon.ico`]
}

export default function PingStatusCard({ devices, onResultsChange }: PingStatusCardProps) {
  const [results, setResults] = useState<Record<string, PingResult>>({})
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const testedResults = Object.values(results).filter((res) => res.tested)
  const onlineCount = testedResults.filter((res) => res.status === 'online' || (res.online && !res.status)).length
  const offlineCount = testedResults.filter((res) => res.status === 'offline' || (!res.online && !res.status)).length
  const unverifiedCount = testedResults.filter((res) => res.status === 'unverified').length
  const hasTestedAll = devices.length > 0 && testedResults.length === devices.length

  // Reseta os resultados quando os dispositivos mudam
  useEffect(() => {
    const initial: Record<string, PingResult> = {}
    devices.forEach((d) => {
      initial[d.id] = { deviceId: d.id, online: false, status: 'offline', latency: 0, tested: false }
    })
    setResults(initial)
    onResultsChange?.(initial)
    setTesting(false)
    setProgress(0)
  }, [devices, onResultsChange])

  const pingIp = async (ip: string, timeout = 2500): Promise<{ online: boolean; status: PingStatus; latency: number; reason?: string }> => {
    for (const target of buildProbeTargets(ip)) {
      const start = Date.now()
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(target, {
          mode: 'cors',
          cache: 'no-store',
          redirect: 'manual',
          signal: controller.signal,
        })
        clearTimeout(id)
        return {
          online: true,
          status: 'online',
          latency: Date.now() - start,
          reason: `HTTP ${response.status || 'ok'}`,
        }
      } catch (err: unknown) {
        clearTimeout(id)
        const errName = typeof err === 'object' && err !== null && 'name' in err ? String((err as any).name) : ''
        if (errName === 'AbortError') continue

        const message = (typeof err === 'object' && err !== null && 'message' in err) ? String((err as any).message).toLowerCase() : String(err).toLowerCase()
        if (message.includes('failed to fetch') || message.includes('networkerror')) {
          return {
            online: false,
            status: 'unverified',
            latency: Date.now() - start,
            reason: 'O navegador bloqueou a leitura da resposta. Nao confirma que e o equipamento deste cliente.',
          }
        }
        if (message.includes('mixed content') || message.includes('blocked')) {
          return {
            online: false,
            status: 'unverified',
            latency: Date.now() - start,
            reason: 'Bloqueado pelo navegador por seguranca.',
          }
        }
      }
    }

    return { online: false, status: 'offline', latency: timeout, reason: 'Sem resposta dentro do tempo limite.' }
  }

  const runAllTests = async () => {
    if (testing || devices.length === 0) return
    setTesting(true)
    setProgress(0)

    // Prepara estado inicial como "testando"
    const runningResults = { ...results }
    
    let completedCount = 0
    const updateProgress = () => {
      completedCount++
      setProgress(Math.round((completedCount / devices.length) * 100))
    }

    // Executa os testes em lotes (paralelo)
    const promises = devices.map(async (device) => {
      if (!device.ip) {
        runningResults[device.id] = { deviceId: device.id, online: false, status: 'offline', latency: 0, tested: true }
        updateProgress()
        return
      }

      // O navegador nao faz ICMP real; este teste so confirma quando a resposta HTTP e legivel.
      const res = await pingIp(device.ip)
      runningResults[device.id] = {
        deviceId: device.id,
        online: res.online,
        status: res.status,
        latency: res.latency,
        tested: true,
        reason: res.reason,
      }
      
      // Atualiza o estado incrementalmente para dar dinamismo na tela
      setResults((prev) => {
        const next = {
          ...prev,
          [device.id]: {
            deviceId: device.id,
            online: res.online,
            status: res.status,
            latency: res.latency,
            tested: true,
            reason: res.reason,
          }
        }
        onResultsChange?.(next)
        return next
      })
      updateProgress()
    })

    await Promise.all(promises)
    setTesting(false)
  }

  const getStatusIcon = (res: PingResult) => {
    if (!res.tested) return <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
    if (res.status === 'online' || (res.online && !res.status)) return <span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_6px_#22c55e]" />
    if (res.status === 'unverified') return <AlertCircle className="w-3.5 h-3.5 text-warning" />
    return <span className="w-2.5 h-2.5 rounded-full bg-danger shadow-[0_0_6px_#ef4444]" />
  }

  if (devices.length === 0) return null

  return (
    <div className="bg-bg-secondary border border-border-light rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            Diagnóstico de Status da Rede Local (Ping)
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            Testa DVRs, câmeras IP/Wi-Fi, switches e roteadores com IP cadastrado. O seu computador/celular precisa estar na rede local do cliente.
          </p>
        </div>
        <Button
          onClick={runAllTests}
          disabled={testing}
          size="sm"
          className="flex items-center gap-1 shrink-0"
        >
          {testing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Testando ({progress}%)</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Testar Conexões</span>
            </>
          )}
        </Button>
      </div>

      {testedResults.length > 0 && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${
            onlineCount > 0
              ? 'bg-success/5 border-success/25 text-success'
              : unverifiedCount > 0
                ? 'bg-warning/5 border-warning/25 text-warning'
              : 'bg-danger/5 border-danger/25 text-danger'
          }`}
        >
          <span className="font-semibold">
            {onlineCount > 0
              ? 'Equipamento confirmado na rede local'
              : unverifiedCount > 0
                ? 'Rede local nao confirmada pelo navegador'
                : 'Fora da rede local ou equipamentos sem resposta'}
          </span>
          <span className="text-[10px] text-text-muted">
            {onlineCount} confirmado · {unverifiedCount} nao verificado · {offlineCount} offline{hasTestedAll ? '' : ' · testando...'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {devices.map((d) => {
          const res = results[d.id] || { tested: false, online: false, status: 'offline', latency: 0 }
          return (
            <div
              key={d.id}
              title={res.reason}
              className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                res.tested
                  ? res.status === 'online' || (res.online && !res.status)
                    ? 'bg-success/5 border-success/20'
                    : res.status === 'unverified'
                      ? 'bg-warning/5 border-warning/20'
                    : 'bg-danger/5 border-danger/20'
                  : 'bg-bg-primary/40 border-border-light/30'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="font-medium text-text-primary truncate">{d.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5 font-mono">
                  <span className="px-1 py-0.2 bg-bg-tertiary rounded text-[8px] uppercase">{d.type}</span>
                  <span>{d.ip}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {res.tested && (
                  <span className="text-[9px] text-text-muted font-mono">
                    {res.status === 'online' || (res.online && !res.status)
                      ? `${res.latency}ms`
                      : res.status === 'unverified'
                        ? 'nao verif.'
                        : 'timeout'}
                  </span>
                )}
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  {testing && !res.tested ? (
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  ) : (
                    getStatusIcon(res)
                  )}
                </div>
              </div>
            </div>
          )}
        )}
      </div>
    </div>
  )
}
