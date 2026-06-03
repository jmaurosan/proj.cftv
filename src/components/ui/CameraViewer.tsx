import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, WifiOff, EyeOff } from 'lucide-react'

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
      if (urls.mjpeg) return { url: urls.mjpeg, type: 'mjpeg' }
      if (urls.snapshot) return { url: urls.snapshot, type: 'snapshot' }
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
                <a
                  href={(() => {
                    const raw = streamUrl || autoUrl().url
                    return injectAuth(raw)
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-3 py-1.5 bg-accent hover:opacity-90 text-[10px] font-bold text-white rounded cursor-pointer uppercase text-center block z-20 pointer-events-auto shadow-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  Autenticar no DVR 🔗
                </a>
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
