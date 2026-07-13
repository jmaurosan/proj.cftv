import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Download, ExternalLink, Grid2X2, Grid3X3, Maximize2, MonitorPlay, Send, Server, Wifi } from 'lucide-react'
import { useCameras } from '../hooks/useCameras'
import { useDvrs } from '../hooks/useDvrs'
import {
  buildLocalCameraStreams,
  buildLocalViewerStorageKey,
  buildMediaMtxDownloadFilename,
  buildMediaMtxConfig,
  formatMediaMtxAgentHealth,
  getLiveViewLayoutLimit,
  getReadyLiveViewStreams,
  getVisibleLiveViewStreams,
  type MediaMtxAgentHealthSummary,
  type LiveViewLayout,
} from '../lib/localCameraViewer'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import { useToast } from '../components/ui/Toast'
import { useClient } from '../contexts/ClientContext'

const LIVE_VIEW_LAYOUTS: Array<{ value: LiveViewLayout; label: string; icon: typeof Grid2X2 }> = [
  { value: '2x2', label: '2x2', icon: Grid2X2 },
  { value: '3x3', label: '3x3', icon: Grid3X3 },
  { value: '4x4', label: '4x4', icon: Grid3X3 },
]

const LIVE_VIEW_GRID_CLASSES: Record<LiveViewLayout, string> = {
  '2x2': 'grid-cols-1 md:grid-cols-2',
  '3x3': 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  '4x4': 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
}

const DEFAULT_AGENT_URL = 'http://127.0.0.1:8727'
const DEFAULT_AGENT_TOKEN = 'cftv-local-agent'

const readStoredValue = (key: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(key) || fallback
}

const readStoredLayout = (clientId: string | null): LiveViewLayout => {
  const value = readStoredValue(buildLocalViewerStorageKey('layout', clientId), '2x2')
  return value === '3x3' || value === '4x4' ? value : '2x2'
}

const isPrivateIpv4 = (host: string) =>
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)

export default function LocalViewerPage() {
  const { data: cameras, loading: camerasLoading } = useCameras()
  const { data: dvrs, loading: dvrsLoading } = useDvrs()
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()
  const [serverIp, setServerIp] = useState(() => readStoredValue(buildLocalViewerStorageKey('server-ip', selectedClientId), ''))
  const [webrtcPort, setWebrtcPort] = useState(() => readStoredValue(buildLocalViewerStorageKey('webrtc-port', selectedClientId), '8889'))
  const [agentUrl, setAgentUrl] = useState(() => readStoredValue(buildLocalViewerStorageKey('agent-url', selectedClientId), DEFAULT_AGENT_URL))
  const [agentToken, setAgentToken] = useState(() => readStoredValue(buildLocalViewerStorageKey('agent-token', selectedClientId), DEFAULT_AGENT_TOKEN))
  const [liveLayout, setLiveLayout] = useState<LiveViewLayout>(() => readStoredLayout(selectedClientId))
  const [showConfig, setShowConfig] = useState(false)
  const [sendingToAgent, setSendingToAgent] = useState(false)
  const [checkingAgent, setCheckingAgent] = useState(false)
  const [agentHealth, setAgentHealth] = useState<MediaMtxAgentHealthSummary | null>(null)
  const [agentHealthError, setAgentHealthError] = useState<string | null>(null)

  const loading = camerasLoading || dvrsLoading
  const streams = useMemo(
    () => buildLocalCameraStreams(cameras, dvrs, { serverIp, webrtcPort }),
    [cameras, dvrs, serverIp, webrtcPort]
  )
  const mediaMtxConfig = useMemo(() => buildMediaMtxConfig(streams), [streams])
  const readyCount = streams.filter((stream) => stream.sourceUrl).length
  const liveReadyStreams = useMemo(() => getReadyLiveViewStreams(streams), [streams])
  const visibleLiveStreams = useMemo(() => getVisibleLiveViewStreams(streams, liveLayout), [streams, liveLayout])
  const layoutLimit = getLiveViewLayoutLimit(liveLayout)

  useEffect(() => {
    setServerIp(readStoredValue(buildLocalViewerStorageKey('server-ip', selectedClientId), ''))
    setWebrtcPort(readStoredValue(buildLocalViewerStorageKey('webrtc-port', selectedClientId), '8889'))
    setAgentUrl(readStoredValue(buildLocalViewerStorageKey('agent-url', selectedClientId), DEFAULT_AGENT_URL))
    setAgentToken(readStoredValue(buildLocalViewerStorageKey('agent-token', selectedClientId), DEFAULT_AGENT_TOKEN))
    setLiveLayout(readStoredLayout(selectedClientId))
    setAgentHealth(null)
    setAgentHealthError(null)
  }, [selectedClientId])

  const handleLayoutChange = (value: LiveViewLayout) => {
    setLiveLayout(value)
    window.localStorage.setItem(buildLocalViewerStorageKey('layout', selectedClientId), value)
  }

  const handleServerIpChange = (value: string) => {
    setServerIp(value)
    window.localStorage.setItem(buildLocalViewerStorageKey('server-ip', selectedClientId), value)
  }

  const handleWebrtcPortChange = (value: string) => {
    setWebrtcPort(value)
    window.localStorage.setItem(buildLocalViewerStorageKey('webrtc-port', selectedClientId), value)
  }

  const handleAgentUrlChange = (value: string) => {
    setAgentUrl(value)
    window.localStorage.setItem(buildLocalViewerStorageKey('agent-url', selectedClientId), value)
  }

  const handleAgentTokenChange = (value: string) => {
    setAgentToken(value)
    window.localStorage.setItem(buildLocalViewerStorageKey('agent-token', selectedClientId), value)
  }

  const copyText = async (value: string, message: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast(message, 'success')
  }

  const downloadMediaMtxConfig = () => {
    if (!mediaMtxConfig) {
      toast('Cadastre ao menos uma câmera com RTSP/IP/DVR para gerar o YAML.', 'error')
      return
    }

    const blob = new Blob([`${mediaMtxConfig}\n`], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildMediaMtxDownloadFilename(selectedClientName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast('Arquivo mediamtx.yml gerado', 'success')
  }

  const sendMediaMtxConfigToAgent = async () => {
    if (!mediaMtxConfig) {
      toast('Cadastre ao menos uma câmera com RTSP/IP/DVR para enviar o YAML.', 'error')
      return
    }

    const normalizedAgentUrl = agentUrl.trim().replace(/\/+$/, '')
    if (!normalizedAgentUrl) {
      toast('Informe a URL do agente local MediaMTX.', 'error')
      return
    }

    setSendingToAgent(true)
    try {
      const response = await fetch(`${normalizedAgentUrl}/config`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cftv-agent-token': agentToken,
        },
        body: JSON.stringify({ yaml: mediaMtxConfig }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar o MediaMTX.')
      }
      toast(`MediaMTX atualizado. Backup: ${payload.backupPath || 'criado'}`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Falha ao conectar no agente MediaMTX.', 'error')
    } finally {
      setSendingToAgent(false)
    }
  }

  const checkMediaMtxAgent = async () => {
    const normalizedAgentUrl = agentUrl.trim().replace(/\/+$/, '')
    if (!normalizedAgentUrl) {
      toast('Informe a URL do agente local MediaMTX.', 'error')
      return
    }

    setCheckingAgent(true)
    setAgentHealthError(null)
    try {
      const response = await fetch(`${normalizedAgentUrl}/health`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Agente MediaMTX não respondeu corretamente.')
      }
      const summary = formatMediaMtxAgentHealth(payload)
      setAgentHealth(summary)
      toast('Agente MediaMTX online', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao conectar no agente MediaMTX.'
      setAgentHealth(null)
      setAgentHealthError(message)
      toast(message, 'error')
    } finally {
      setCheckingAgent(false)
    }
  }

  const openPlayer = (url: string) => {
    if (!url) {
      toast('Informe o IP do servidor local antes de abrir a câmera.', 'error')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const useCurrentUrlIp = () => {
    const host = window.location.hostname
    if (isPrivateIpv4(host)) {
      handleServerIpChange(host)
      toast('IP preenchido pela URL atual.', 'success')
      return
    }
    toast('Pela Vercel não dá para detectar o IP local. Informe o IP do notebook/PC servidor.', 'error')
  }

  return (
    <div className="space-y-5">
      <ClientFilterBanner />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
            <MonitorPlay className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Visualização Local</h1>
            <p className="text-text-muted text-sm">Abra câmeras pelo MediaMTX durante a instalação.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 min-w-full sm:min-w-[260px] lg:min-w-[300px]">
          <div className="bg-bg-secondary border border-border-light rounded-xl p-3">
            <p className="text-xs text-text-muted">Câmeras prontas</p>
            <p className="text-2xl font-bold text-text-primary">{readyCount}</p>
          </div>
          <div className="bg-bg-secondary border border-border-light rounded-xl p-3">
            <p className="text-xs text-text-muted">Total do projeto</p>
            <p className="text-2xl font-bold text-text-primary">{streams.length}</p>
          </div>
        </div>
      </div>

      <section className="bg-bg-secondary border border-border-light rounded-xl p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-text-primary">Servidor MediaMTX</h2>
            <p className="text-sm text-text-muted mt-1">
              Informe o IP local do notebook/PC que está rodando o MediaMTX para {selectedClientName || 'a visão geral'}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] lg:grid-cols-[1fr_120px_auto_auto_auto] gap-3">
          <Input
            label="IP do servidor"
            value={serverIp}
            onChange={(event) => handleServerIpChange(event.target.value)}
            placeholder="Ex.: 192.168.1.50"
          />
          <Input
            label="Porta"
            value={webrtcPort}
            onChange={(event) => handleWebrtcPortChange(event.target.value)}
            placeholder="8889"
          />
          <Button variant="secondary" onClick={useCurrentUrlIp} className="w-full lg:self-end">
            Usar IP desta URL
          </Button>
          <Button
            variant="secondary"
            onClick={downloadMediaMtxConfig}
            disabled={!mediaMtxConfig}
            className="w-full lg:self-end"
          >
            <Download className="w-4 h-4" />
            Baixar YAML
          </Button>
          <Button
            variant="primary"
            onClick={() => copyText(mediaMtxConfig, 'Configuração copiada')}
            disabled={!mediaMtxConfig}
            className="w-full lg:self-end"
          >
            <Copy className="w-4 h-4" />
            Copiar YAML
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] lg:grid-cols-[1fr_180px_auto] gap-3">
          <Input
            label="URL do agente local"
            value={agentUrl}
            onChange={(event) => handleAgentUrlChange(event.target.value)}
            placeholder="http://127.0.0.1:8727"
          />
          <Input
            label="Token do agente"
            type="password"
            value={agentToken}
            onChange={(event) => handleAgentTokenChange(event.target.value)}
            placeholder="Token local"
          />
          <Button
            variant="primary"
            onClick={sendMediaMtxConfigToAgent}
            disabled={!mediaMtxConfig || sendingToAgent}
            className="w-full lg:self-end"
          >
            <Send className="w-4 h-4" />
            {sendingToAgent ? 'Enviando...' : 'Enviar para MediaMTX'}
          </Button>
        </div>

        <div className="rounded-lg border border-border-light bg-bg-primary/50 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${agentHealth?.online ? 'bg-success' : agentHealthError ? 'bg-danger' : 'bg-text-muted'}`} />
                <h3 className="font-semibold text-text-primary">Status do agente local</h3>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {agentHealth?.online ? 'Online e pronto para atualizar o arquivo do MediaMTX.' : agentHealthError || 'Verifique se o agente está rodando antes de enviar.'}
              </p>
              {agentHealth?.configPath && (
                <code className="mt-2 block break-all rounded border border-border-light bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
                  {agentHealth.configPath}
                </code>
              )}
              {agentHealth?.allowedOriginsText && (
                <p className="mt-2 break-all text-xs text-text-muted">
                  Origens permitidas: {agentHealth.allowedOriginsText}
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={checkMediaMtxAgent} disabled={checkingAgent} className="w-full lg:w-auto">
              <CheckCircle2 className="w-4 h-4" />
              {checkingAgent ? 'Verificando...' : 'Verificar agente'}
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig((current) => !current)}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {showConfig ? 'Ocultar configuração MediaMTX' : 'Ver configuração MediaMTX'}
        </button>

        {showConfig && (
          <pre className="max-h-[320px] overflow-auto rounded-lg border border-border-light p-4 text-xs text-text-secondary bg-bg-primary/60">
            {mediaMtxConfig || 'Cadastre IP/credenciais da câmera, uma URL RTSP ou vincule câmeras a um DVR com IP e canal para gerar a configuração.'}
          </pre>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Mosaico ao vivo</h2>
            <p className="text-sm text-text-muted">
              Visualização embutida das câmeras prontas no MediaMTX/WebRTC.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg border border-border-light bg-bg-secondary p-1">
              {LIVE_VIEW_LAYOUTS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleLayoutChange(value)}
                  className={`inline-flex min-w-16 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    liveLayout === value
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                  title={`Mosaico ${label}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-border-light bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
              {visibleLiveStreams.length}/{layoutLimit} exibidas
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : visibleLiveStreams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-light bg-bg-secondary p-8 text-center">
            <MonitorPlay className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <h3 className="font-semibold text-text-primary">Nenhuma câmera pronta para o mosaico</h3>
            <p className="mx-auto mt-1 max-w-2xl text-sm text-text-muted">
              Informe o IP do servidor MediaMTX e garanta que as câmeras tenham RTSP, IP direto ou vínculo com DVR/canal.
            </p>
          </div>
        ) : (
          <div className={`grid gap-3 ${LIVE_VIEW_GRID_CLASSES[liveLayout]}`}>
            {visibleLiveStreams.map((stream) => (
              <article key={`live-${stream.camera.id}-${stream.streamName}`} className="overflow-hidden rounded-lg border border-border-light bg-bg-secondary">
                <div className="aspect-video bg-black">
                  <iframe
                    title={`Live View ${stream.camera.name}`}
                    src={stream.playerUrl}
                    className="h-full w-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-text-primary">{stream.camera.name}</h3>
                      <p className="truncate text-xs text-text-muted">
                        {stream.dvr?.name || (stream.camera.ip_address ? `IP ${stream.camera.ip_address}` : 'RTSP direto')}
                        {stream.camera.channel_number ? ` · Canal ${stream.camera.channel_number}` : ''}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pronta
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openPlayer(stream.playerUrl)} className="w-full">
                      <Maximize2 className="h-4 w-4" />
                      Ampliar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => copyText(stream.playerUrl, 'Link copiado')} className="w-full">
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && liveReadyStreams.length > layoutLimit && (
          <p className="text-sm text-text-muted">
            Existem {liveReadyStreams.length - layoutLimit} câmeras prontas fora do mosaico atual. Aumente o layout para exibir mais canais.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Câmeras do projeto</h2>
          <p className="text-sm text-text-muted">
            Câmera IP, Wi-Fi ou canal do DVR são gerados como links individuais.
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : streams.length === 0 ? (
          <div className="bg-bg-secondary border border-border-light rounded-xl p-8 text-center">
            <Wifi className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="font-semibold text-text-primary">Nenhuma câmera cadastrada</h3>
            <p className="text-sm text-text-muted mt-1">
              Cadastre câmeras primeiro para gerar os links de visualização local.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {streams.map((stream) => (
              <article key={`${stream.camera.id}-${stream.streamName}`} className="bg-bg-secondary border border-border-light rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">{stream.camera.name}</h3>
                    <p className="text-sm text-text-muted">
                      {stream.dvr?.name || (stream.camera.ip_address ? `IP ${stream.camera.ip_address}` : 'Sem DVR')}
                      {stream.camera.channel_number ? ` · Canal ${stream.camera.channel_number}` : ''}
                    </p>
                  </div>
                  {stream.sourceUrl ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                  )}
                </div>

                {stream.playerUrl && stream.sourceUrl && (
                  <code className="block bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-xs text-text-secondary break-all">
                    {stream.playerUrl}
                  </code>
                )}

                {stream.warnings.length > 0 && (
                  <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                    {stream.warnings[0]}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    onClick={() => openPlayer(stream.playerUrl)}
                    disabled={!stream.sourceUrl}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir câmera
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => copyText(stream.playerUrl, 'Link copiado')}
                    disabled={!stream.playerUrl || !stream.sourceUrl}
                    className="w-full"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar link
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
