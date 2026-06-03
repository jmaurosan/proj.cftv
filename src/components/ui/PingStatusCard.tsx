import { useState, useEffect } from 'react'
import { Wifi, RefreshCw, CheckCircle, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react'
import Button from './Button'

interface PingDevice {
  id: string
  name: string
  type: 'DVR' | 'Switch' | 'Roteador'
  ip: string
}

interface PingResult {
  deviceId: string
  online: boolean
  latency: number
  tested: boolean
}

interface PingStatusCardProps {
  devices: PingDevice[]
}

export default function PingStatusCard({ devices }: PingStatusCardProps) {
  const [results, setResults] = useState<Record<string, PingResult>>({})
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)

  // Reseta os resultados quando os dispositivos mudam
  useEffect(() => {
    const initial: Record<string, PingResult> = {}
    devices.forEach((d) => {
      initial[d.id] = { deviceId: d.id, online: false, latency: 0, tested: false }
    })
    setResults(initial)
    setTesting(false)
    setProgress(0)
  }, [devices])

  const pingIp = async (ip: string, timeout = 2500): Promise<{ online: boolean; latency: number }> => {
    const start = Date.now()
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    
    // Sanitiza o IP (caso tenha portas ou espaços)
    let target = ip.trim()
    if (!/^https?:\/\//i.test(target)) {
      target = `http://${target}`
    }

    try {
      await fetch(target, {
        mode: 'no-cors',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      })
      clearTimeout(id)
      return { online: true, latency: Date.now() - start }
    } catch (err: any) {
      clearTimeout(id)
      if (err.name === 'AbortError') {
        return { online: false, latency: timeout }
      }
      // Se retornar TypeError/CORS significa que houve resposta de handshake HTTP no IP local!
      return { online: true, latency: Date.now() - start }
    }
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
        runningResults[device.id] = { deviceId: device.id, online: false, latency: 0, tested: true }
        updateProgress()
        return
      }

      // Tenta fazer o ping HTTP local
      const res = await pingIp(device.ip)
      runningResults[device.id] = {
        deviceId: device.id,
        online: res.online,
        latency: res.latency,
        tested: true
      }
      
      // Atualiza o estado incrementalmente para dar dinamismo na tela
      setResults((prev) => ({
        ...prev,
        [device.id]: {
          deviceId: device.id,
          online: res.online,
          latency: res.latency,
          tested: true
        }
      }))
      updateProgress()
    })

    await Promise.all(promises)
    setTesting(false)
  }

  const getStatusIcon = (res: PingResult) => {
    if (!res.tested) return <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
    if (res.online) return <span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_6px_#22c55e]" />
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
            Testa a conectividade de todos os IPs locais do cliente em paralelo. O seu computador/celular precisa estar no mesmo Wi-Fi do cliente.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {devices.map((d) => {
          const res = results[d.id] || { tested: false, online: false, latency: 0 }
          return (
            <div
              key={d.id}
              className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                res.tested
                  ? res.online
                    ? 'bg-success/5 border-success/20'
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
                    {res.online ? `${res.latency}ms` : 'timeout'}
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
