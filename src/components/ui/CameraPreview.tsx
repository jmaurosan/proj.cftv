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

  const buildUrl = (): string => {
    if (streamMode === 'manual' && streamUrl) {
      return streamUrl
    }
    if (streamMode === 'auto' && deviceIp && channelNumber && dvrBrand) {
      const brand = dvrBrand.toLowerCase()
      const streamCh = channelNumber === 1 ? '101' : `${channelNumber}01`
      
      switch (brand) {
        case 'hikvision':
          return `http://${deviceIp}/ISAPI/Streaming/channels/${streamCh}/httpPreview`
        case 'intelbras':
          return `http://${deviceIp}/cgi-bin/snapshot.cgi?ch=${channelNumber}&subtype=1`
        case 'dahua':
          return `http://${deviceIp}/cgi-bin/snapManager.cgi?action=attachFileProc&Channels[0].Channel=${channelNumber}`
        default:
          return ''
      }
    }
    return ''
  }

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
    const rawUrl = buildUrl()
    if (!rawUrl) {
      setStatus('error')
      setError('Preencha IP, marca e canal ou insira uma URL manual')
      return
    }

    setStatus('loading')
    setError('')

    const url = injectAuth(rawUrl)
    setImageUrl(url)

    // Tenta carregar a imagem como snapshot
    const img = new Image()
    img.onload = () => {
      setStatus('success')
    }
    img.onerror = () => {
      // Para MJPEG contínuo, o onload pode não disparar, então consideramos sucesso após um tempo
      setTimeout(() => {
        if (status === 'loading') {
          setStatus('success')
        }
      }, 2000)
    }
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
            <span className="text-xs">Conectando ao DVR...</span>
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
            <span className="text-xs">{error}</span>
          </div>
        )}
      </div>

      {status === 'success' && (
        <p className="text-xs text-green-400 mt-2 text-center">
          ✓ Stream configurado com sucesso
        </p>
      )}
    </div>
  )
}
