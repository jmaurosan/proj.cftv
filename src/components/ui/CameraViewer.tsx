import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, WifiOff, EyeOff } from 'lucide-react'
import Modal from './Modal'

/** URLs RTSP por marca do DVR/NVR */
const RTSP_URLS: Record<string, (ip: string, port: number, channel: number, stream?: 'main' | 'sub') => string> = {
  hikvision: (ip, port = 554, ch, stream = 'main') => {
    const streamType = stream === 'sub' ? '2' : '1'
    return `rtsp://${ip}:${port}/Streaming/Channels/${ch}0${streamType}`
  },
  intelbras: (ip, port = 554, ch) => {
    return `rtsp://${ip}:${port}/cam${ch}/h264`
  },
  dahua: (ip, port = 554, ch, stream = 'main') => {
    const streamType = stream === 'sub' ? '2' : '1'
    return `rtsp://${ip}:${port}/cam/realmonitor?channel=${ch}&subtype=${streamType}`
  },
  amcrest: (ip, port = 554, ch, stream = 'main') => {
    const streamType = stream === 'sub' ? '2' : '1'
    return `rtsp://${ip}:${port}/cam/realmonitor?channel=${ch}&subtype=${streamType}`
  },
}

/** URLs HTTP por marca do DVR/NVR */
const DVR_URLS: Record<string, (ip: string, channel: number, subtype?: 'main' | 'sub') => { mjpeg?: string; snapshot?: string; hls?: string }> = {
  hikvision: (ip, ch, _sub = 'main') => {
    const streamCh = ch === 1 ? '101' : `${ch}01`
    return {
      mjpeg: `http://${ip}/ISAPI/Streaming/channels/${streamCh}/httpPreview`,
      snapshot: `http://${ip}/ISAPI/Streaming/channels/${streamCh}/picture`,
      hls: `http://${ip}/ISAPI/Streaming/channels/${streamCh}/hlsVideo.m3u8`,
    }
  },
  intelbras: (ip, ch) => {
    return {
      snapshot: `http://${ip}/cgi-bin/snapshot.cgi?channel=${ch}`,
    }
  },
  dahua: (ip, ch) => {
    return {
      mjpeg: `http://${ip}/cgi-bin/snapshot.cgi?channel=${ch}`,
      snapshot: `http://${ip}/cgi-bin/snapshot.cgi?channel=${ch}`,
      hls: `http://${ip}/cgi-bin/stream.cgi?action=getHls&channel=${ch}`,
    }
  },
  amcrest: (ip, ch) => {
    return {
      snapshot: `http://${ip}/cgi-bin/snapshot.cgi?channel=${ch}`,
    }
  },
}

interface CameraViewerProps {
  cameraName: string
  /** URL direta de streaming (RTSP, MJPEG, HLS ou snapshot) — override manual */
  streamUrl?: string | null
  /** IP do DVR/NVR ou câmera IP */
  deviceIp?: string | null
  /** Canal da câmera no DVR (1, 2, 3...) */
  channelNumber?: number | null
  /** Marca do DVR: hikvision, intelbras, dahua ou outra */
  dvrBrand?: string | null
  /** Usuário para autenticação HTTP Basic */
  streamUser?: string | null
  /** Senha para autenticação HTTP Basic */
  streamPass?: string | null
}

type ViewerMode = 'mjpeg' | 'snapshot' | 'hls' | 'iframe' | 'error' | 'connecting'

export default function CameraViewer({
  cameraName,
  streamUrl,
  deviceIp,
  channelNumber,
  dvrBrand,
  streamUser,
  streamPass,
}: CameraViewerProps) {
  const [mode, setMode] = useState<ViewerMode>('connecting')
  const [snapshotKey, setSnapshotKey] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Gera URL automática a partir do IP/canal/marca
  const autoUrl = useCallback((): { url: string; type: 'mjpeg' | 'snapshot' | 'hls' | 'rtsp' | null } => {
    if (!deviceIp || !channelNumber) return { url: '', type: null }
    const brand = (dvrBrand || '').toLowerCase()
    
    // Tenta HTTP primeiro
    const resolver = DVR_URLS[brand]
    if (resolver) {
      const urls = resolver(deviceIp, channelNumber)
      if (urls.snapshot) return { url: urls.snapshot, type: 'snapshot' }
      if (urls.mjpeg) return { url: urls.mjpeg, type: 'mjpeg' }
      if (urls.hls) return { url: urls.hls, type: 'hls' }
    }
    
    // Fallback para RTSP
    const rtspResolver = RTSP_URLS[brand]
    if (rtspResolver) {
      return { url: rtspResolver(deviceIp, 554, channelNumber), type: 'rtsp' }
    }
    
    return { url: '', type: null }
  }, [deviceIp, channelNumber, dvrBrand])

  // Injeta credenciais na URL se houver usuário/senha
  const injectAuth = useCallback((url: string): string => {
    if (!url || !streamUser || !streamPass) return url
    try {
      const urlObj = new URL(url)
      urlObj.username = streamUser
      urlObj.password = streamPass
      return urlObj.toString()
    } catch {
      // Se a URL não for válida, injeta manualmente
      const protocolEnd = url.indexOf('://')
      if (protocolEnd === -1) return url
      const protocol = url.substring(0, protocolEnd + 3)
      const rest = url.substring(protocolEnd + 3)
      return `${protocol}${streamUser}:${encodeURIComponent(streamPass)}@${rest}`
    }
  }, [streamUser, streamPass])

  // Snapshot polling para DVRs sem MJPEG contínuo
  useEffect(() => {
    if (mode !== 'snapshot') return
    const interval = setInterval(() => {
      setSnapshotKey(k => k + 1)
    }, 1000) // 1fps — ajuste conforme banda
    return () => clearInterval(interval)
  }, [mode])

  // Decide o método de visualização
  useEffect(() => {
    setMode('connecting')

    // 1) Se há URL manual, usa como iframe ou snapshot
    if (streamUrl) {
      const isHttp = streamUrl.startsWith('http')
      const isRtsp = streamUrl.startsWith('rtsp://')
      if (isHttp && (streamUrl.includes('.m3u8') || streamUrl.includes('/hls'))) {
        // HLS direto — tenta iframe
        setMode('iframe')
      } else if (isHttp && streamUrl.includes('.mjpg')) {
        setMode('mjpeg')
      } else if (isHttp) {
        // Assume snapshot URL
        setMode('snapshot')
      } else if (isRtsp) {
        // RTSP não roda no browser — avisa
        setMode('error')
      }
      return
    }

    // 2) Tenta auto-detectar pelo IP/canal/marca
    const { url, type } = autoUrl()
    if (url && type) {
      if (type === 'mjpeg') setMode('mjpeg')
      else if (type === 'snapshot') setMode('snapshot')
      else if (type === 'hls') setMode('iframe')
      return
    }

    // 3) Sem dados suficientes
    setMode('error')
  }, [streamUrl, autoUrl])

  const renderContent = () => {
    // MJPEG stream (contínuo via <img>)
    if (mode === 'mjpeg') {
      const rawUrl = streamUrl || autoUrl().url
      if (!rawUrl) return <NoSignal />
      const url = injectAuth(rawUrl)
      return (
        <img
          ref={imgRef}
          src={`${url}?t=${Date.now()}`}
          alt={cameraName}
          className="w-full h-full object-cover"
          onLoad={() => setMode('mjpeg')}
          onError={() => setMode('error')}
        />
      )
    }

    // Snapshot polling (atualiza a cada 1s)
    if (mode === 'snapshot') {
      const rawUrl = streamUrl || autoUrl().url
      if (!rawUrl) return <NoSignal />
      const url = injectAuth(rawUrl)
      return (
        <img
          ref={imgRef}
          src={`${url}&_=${snapshotKey}`}
          alt={cameraName}
          className="w-full h-full object-cover"
          onLoad={() => setMode('snapshot')}
          onError={() => setMode('error')}
        />
      )
    }

    // HLS ou iframe genérico
    if (mode === 'iframe') {
      const rawUrl = streamUrl || autoUrl().url
      if (!rawUrl) return <NoSignal />
      const url = injectAuth(rawUrl)
      return (
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          allow="autoplay"
          sandbox="allow-same-origin allow-scripts"
          onError={() => setMode('error')}
        />
      )
    }

    const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && (streamUrl || autoUrl().url || '').startsWith('http:')

    // Erro ou sem dados
    if (mode === 'error' || mode === 'connecting') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-primary/80">
          {mode === 'connecting' ? (
            <>
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <span className="text-xs text-text-muted">Conectando...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-8 h-8 text-danger opacity-60" />
              <span className="text-xs text-text-muted text-center px-4">
                {!deviceIp && !streamUrl
                  ? 'Sem URL configurada'
                  : 'Falha na conexão'}
              </span>
              {dvrBrand && channelNumber && (
                <span className="text-[10px] text-text-muted">
                  {dvrBrand} ch{channelNumber}
                </span>
              )}
              {deviceIp && channelNumber && (
                <div className="flex flex-col gap-1 items-center z-20 pointer-events-auto">
                  <a
                    href={(() => {
                      const raw = streamUrl || autoUrl().url
                      return injectAuth(raw)
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-accent hover:opacity-90 text-[10px] font-bold text-white rounded cursor-pointer uppercase text-center block shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Autenticar no DVR 🔗
                  </a>
                  {isMixedContent && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowHelp(true); }}
                      className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-[9px] font-medium rounded cursor-pointer text-center block transition-colors"
                    >
                      Bloqueio de IP Local? ⚠️
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    return <NoSignal />
  }

  return (
    <div className="relative w-full h-full bg-bg-primary">
      {renderContent()}

      {/* Overlay com nome da câmera */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[10px] sm:text-xs font-medium text-white bg-black/50 px-1.5 sm:px-2 py-0.5 rounded truncate max-w-[120px] sm:max-w-[200px] inline-block">
          {cameraName}
        </span>
      </div>

      {/* Modal explicativo de mixed content */}
      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Habilitar Visualização de Câmeras Locais" size="md">
        <div className="space-y-4 text-sm text-text-primary p-1">
          <p>
            Como o sistema está hospedado em um servidor seguro (<strong>HTTPS</strong> na Vercel), os navegadores de computador bloqueiam por padrão conexões a dispositivos da rede local que utilizem o protocolo <strong>HTTP</strong> comum (como o IP do seu DVR ou câmeras).
          </p>
          
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
            <strong>Nota técnica:</strong> Esta liberação é feita localmente no seu próprio navegador e é segura. Ela apenas autoriza o navegador a conectar o sistema na nuvem com a sua rede local física.
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-primary">No Google Chrome (Computador):</h5>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary pl-1">
              <li>Na barra de endereços (onde digita o link do site), clique no ícone de <strong>configurações / controles deslizantes</strong> (ou ícone de cadeado) à esquerda do link.</li>
              <li>Clique em <strong>"Configurações do site"</strong>.</li>
              <li>Na lista que se abre, role até encontrar a opção <strong>"Conteúdo não seguro"</strong> (Insecure content).</li>
              <li>Mude de <strong>"Bloquear (padrão)"</strong> para <strong>"Permitir"</strong>.</li>
              <li>Volte à aba do sistema de CFTV e <strong>atualize a página (F5)</strong>.</li>
            </ol>
          </div>

          <div className="space-y-2 border-t border-border-light pt-3">
            <h5 className="font-semibold text-primary">No Microsoft Edge (Computador):</h5>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary pl-1">
              <li>Clique no ícone de <strong>cadeado ou informação</strong> na barra de endereços do Edge.</li>
              <li>Selecione <strong>"Permissões para este site"</strong>.</li>
              <li>Procure por <strong>"Conteúdo não seguro"</strong> e mude a caixa de seleção para <strong>"Permitir"</strong>.</li>
              <li>Recarregue a página do sistema.</li>
            </ol>
          </div>

          <div className="space-y-2 border-t border-border-light pt-3 text-xs text-text-muted">
            <p>
              <strong>Dispositivos Móveis (Android/iOS):</strong> Os navegadores de celular são extremamente rígidos e geralmente não permitem esta liberação de conteúdo misto. Para celulares, a recomendação é copiar a <strong>URL RTSP</strong> (gerada na tela de configuração) e colá-la em aplicativos como <strong>IP Cam Viewer</strong> ou <strong>VLC</strong> conectados ao mesmo Wi-Fi.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function NoSignal() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
      <EyeOff className="w-8 h-8 sm:w-12 sm:h-12 opacity-30" />
      <span className="text-[10px] sm:text-xs text-center px-4">Sem sinal</span>
    </div>
  )
}
