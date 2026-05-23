import { useState } from 'react'
import { Loader2, EyeOff } from 'lucide-react'

interface CameraPreviewProps {
  streamUrl?: string | null
  streamUser?: string | null
  streamPass?: string | null
  deviceIp?: string | null
  channelNumber?: number | null
  dvrBrand?: string | null
  streamMode?: 'auto' | 'manual'
}

export default function CameraPreview({
  streamUrl,
  streamUser,
  streamPass,
  deviceIp,
  channelNumber,
  dvrBrand,
  streamMode,
}: CameraPreviewProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [error, setError] = useState<string>('')

  const injectAuth = (url: string): string => {
    if (!url || !streamUser || !streamPass) return url
    try {
      const urlObj = new URL(url)
      urlObj.username = streamUser
      urlObj.password = streamPass
      return urlObj.toString()
    } catch {
      const protocolEnd = url.indexOf('://')
      if (protocolEnd === -1) return url
      const protocol = url.substring(0, protocolEnd + 3)
      const rest = url.substring(protocolEnd + 3)
      return `${protocol}${streamUser}:${encodeURIComponent(streamPass)}@${rest}`
    }
  }

  const testStream = async () => {
    // Tenta primeiro com modo Auto (IP/marca/canal)
    let rawUrl = ''
    if (deviceIp && channelNumber && dvrBrand) {
      const brand = dvrBrand.toLowerCase()
      const streamCh = channelNumber === 1 ? '101' : `${channelNumber}01`
      
      switch (brand) {
        case 'hikvision':
          rawUrl = `http://${deviceIp}/ISAPI/Streaming/channels/${streamCh}/httpPreview`
          break
        case 'intelbras':
        case 'amcrest':
          rawUrl = `http://${deviceIp}/cgi-bin/snapshot.cgi?ch=${channelNumber}&subtype=1`
          break
        case 'dahua':
          rawUrl = `http://${deviceIp}/cgi-bin/snapManager.cgi?action=attachFileProc&Channels[0].Channel=${channelNumber}`
          break
      }
    }
    
    // Se não tem dados Auto, usa o modo Manual
    if (!rawUrl && streamMode === 'manual' && streamUrl) {
      rawUrl = streamUrl.trim()
      if (/^\d+\.\d+\.\d+\.\d+$/.test(rawUrl) && dvrBrand && channelNumber) {
        const brand = dvrBrand.toLowerCase()
        const streamCh = channelNumber === 1 ? '101' : `${channelNumber}01`
        
        switch (brand) {
          case 'hikvision':
            rawUrl = `http://${rawUrl}/ISAPI/Streaming/channels/${streamCh}/httpPreview`
            break
          case 'intelbras':
          case 'amcrest':
            rawUrl = `http://${rawUrl}/cgi-bin/snapshot.cgi?ch=${channelNumber}&subtype=1`
            break
          case 'dahua':
            rawUrl = `http://${rawUrl}/cgi-bin/snapManager.cgi?action=attachFileProc&Channels[0].Channel=${channelNumber}`
            break
        }
      }
    }
    
    if (!rawUrl) {
      setStatus('error')
      setError('Preencha IP, marca e canal ou insira uma URL completa')
      return
    }

    setStatus('loading')
    setError('')

    const url = injectAuth(rawUrl)
    setImageUrl(url)

    // Tenta carregar a imagem como snapshot com timeout
    const img = new Image()
    let loaded = false
    
    img.onload = () => {
      if (!loaded) {
        loaded = true
        setStatus('success')
      }
    }
    
    img.onerror = () => {
      if (!loaded) {
        loaded = true
        // Timeout curto para MJPEG, depois assume erro
        setTimeout(() => {
          if (status === 'loading' && !loaded) {
            setStatus('error')
            setError('Não foi possível carregar a imagem. Verifique:\n• IP e porta corretos\n• Câmera ligada na rede\n• Credenciais válidas\n• CORS permitido na câmera\n\nDica: Use o app IP Cam Viewer com a URL RTSP abaixo.')
          }
        }, 3000)
      }
    }
    
    // Timeout geral de 8 segundos
    setTimeout(() => {
      if (!loaded && status === 'loading') {
        loaded = true
        setStatus('error')
        setError('Timeout ao conectar. Verifique:\n• Câmera acessível na rede (ping 192.168.0.29)\n• Porta HTTP aberta (80)\n• Credenciais admin/senha corretas\n• Navegador permite HTTP (não HTTPS)\n\nAlternativa: Use a URL RTSP em app externo.')
      }
    }, 8000)
    
    img.src = url
  }

  const hasConfig = 
    (streamMode === 'manual' && streamUrl) ||
    (streamMode === 'auto' && deviceIp && channelNumber && dvrBrand)

  return (
    <div className="bg-bg-secondary border border-border-light rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-text-secondary">Preview do Streaming</h4>
        <button
          type="button"
          onClick={testStream}
          disabled={!hasConfig || status === 'loading'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Testando...
            </>
          ) : (
            'Testar'
          )}
        </button>
      </div>

      <div className="aspect-video bg-bg-primary rounded-md overflow-hidden relative">
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
            <EyeOff className="w-8 h-8 opacity-30 mb-2" />
            <span className="text-xs">Configure o streaming e clique em "Testar"</span>
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted bg-bg-primary/80">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
            <span className="text-xs">Conectando... (máx. 8s)</span>
            <span className="text-[10px] text-text-muted mt-1">{imageUrl || 'Gerando URL...'}</span>
          </div>
        )}

        {status === 'success' && imageUrl && (
          <img
            src={imageUrl}
            alt="Preview da câmera"
            className="w-full h-full object-cover"
            onError={() => {
              // Se for MJPEG contínuo, pode falhar no snapshot mas ainda funcionar
              setStatus('success')
            }}
          />
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-danger text-center px-4">
            <EyeOff className="w-8 h-8 opacity-60 mb-2" />
            <span className="text-xs whitespace-pre-line">{error}</span>
          </div>
        )}
      </div>

      {status === 'success' && (
        <p className="text-xs text-green-400 mt-2 text-center">
          ✓ Stream configurado com sucesso
        </p>
      )}

      {/* URL RTSP para apps externos */}
      {deviceIp && channelNumber && dvrBrand && (
        <div className="mt-3 pt-3 border-t border-border-light">
          <label className="text-xs font-medium text-text-secondary mb-1 block">
            URL RTSP (para apps externos):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={(() => {
                const brand = dvrBrand.toLowerCase()
                const port = 554
                switch (brand) {
                  case 'hikvision':
                    return `rtsp://${deviceIp}:${port}/Streaming/Channels/${channelNumber}01`
                  case 'intelbras':
                    return `rtsp://${deviceIp}:${port}/cam${channelNumber}/h264`
                  case 'dahua':
                  case 'amcrest':
                    return `rtsp://${deviceIp}:${port}/cam/realmonitor?channel=${channelNumber}&subtype=1`
                  default:
                    return ''
                }
              })()}
              className="flex-1 px-2 py-1.5 bg-bg-primary border border-border-light rounded text-xs text-text-primary font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const brand = (dvrBrand || '').toLowerCase()
                const port = 554
                let url = ''
                switch (brand) {
                  case 'hikvision':
                    url = `rtsp://${deviceIp}:${port}/Streaming/Channels/${channelNumber}01`
                    break
                  case 'intelbras':
                    url = `rtsp://${deviceIp}:${port}/cam${channelNumber}/h264`
                    break
                  case 'dahua':
                  case 'amcrest':
                    url = `rtsp://${deviceIp}:${port}/cam/realmonitor?channel=${channelNumber}&subtype=1`
                    break
                }
                if (url) navigator.clipboard.writeText(url)
              }}
              className="px-2.5 py-1.5 bg-bg-tertiary hover:bg-bg-secondary text-text-primary text-xs rounded transition-colors"
              title="Copiar URL"
            >
              Copiar
            </button>
          </div>
          <p className="text-[10px] text-text-muted mt-1">
            Use esta URL em apps como IP Cam Viewer, VLC ou outros players RTSP.
          </p>
        </div>
      )}

      {/* Alerta sobre limitações do preview HTTP */}
      <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
        <p className="text-[10px] text-amber-200">
          ️ <strong>Nota:</strong> O preview HTTP pode não funcionar em alguns navegadores devido a restrições de CORS e autenticação. 
          Para teste confiável, use a URL RTSP acima em apps como <strong>IP Cam Viewer</strong> (Android/iOS) ou <strong>VLC</strong> (desktop).
        </p>
      </div>
    </div>
  )
}
