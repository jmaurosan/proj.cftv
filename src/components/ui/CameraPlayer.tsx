import { useEffect, useRef, useState } from 'react'
import { VideoOff, Loader2, WifiOff } from 'lucide-react'

interface CameraPlayerProps {
  /** Camera name displayed on screen */
  name: string
  /** RTSP URL registered for the camera */
  rtspUrl: string
  /** go2rtc server base URL (e.g. http://192.168.1.x:1984) */
  go2rtcUrl: string
}

type PlayerState = 'connecting' | 'playing' | 'error'

/**
 * Connects to go2rtc via WebSocket and plays the stream using MSE (Media Source Extensions).
 * This avoids needing any browser plugins to play RTSP streams.
 */
export default function CameraPlayer({ name, rtspUrl, go2rtcUrl }: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const msRef = useRef<MediaSource | null>(null)
  const [state, setState] = useState<PlayerState>('connecting')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !rtspUrl || !go2rtcUrl) return

    let sourceBuffer: SourceBuffer | null = null
    let bufferQueue: ArrayBuffer[] = []
    let isUpdating = false

    const streamId = encodeURIComponent(name)

    // Step 1: Register the RTSP stream in go2rtc via API
    const registerStream = async () => {
      try {
        await fetch(`${go2rtcUrl}/api/streams?dst=${streamId}&src=${encodeURIComponent(rtspUrl)}`, {
          method: 'PUT',
        })
      } catch {
        // Stream may already exist, continue
      }
    }

    // Step 2: Connect via WebSocket for MSE playback
    const connect = async () => {
      setState('connecting')
      await registerStream()

      const wsProtocol = go2rtcUrl.startsWith('https') ? 'wss' : 'ws'
      const wsHost = go2rtcUrl.replace(/^https?:\/\//, '')
      const wsUrl = `${wsProtocol}://${wsHost}/api/ws?src=${streamId}`

      const ms = new MediaSource()
      msRef.current = ms
      video.src = URL.createObjectURL(ms)

      ms.addEventListener('sourceopen', () => {
        const ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            // First message is the codec info as JSON
            try {
              const msg = JSON.parse(event.data)
              if (msg.type === 'mse') {
                const mimeCodec = msg.value
                if (MediaSource.isTypeSupported(mimeCodec)) {
                  sourceBuffer = ms.addSourceBuffer(mimeCodec)
                  sourceBuffer.mode = 'segments'
                  sourceBuffer.addEventListener('updateend', () => {
                    isUpdating = false
                    if (bufferQueue.length > 0 && sourceBuffer && !sourceBuffer.updating) {
                      isUpdating = true
                      sourceBuffer.appendBuffer(bufferQueue.shift()!)
                    }
                  })
                  // Send back that we're ready for MSE
                  ws.send(JSON.stringify({ type: 'mse', value: '' }))
                } else {
                  console.warn('Codec not supported:', mimeCodec)
                  setState('error')
                }
              }
            } catch {
              // Not JSON, ignore
            }
          } else if (event.data instanceof ArrayBuffer) {
            if (!sourceBuffer) return

            if (sourceBuffer.updating || isUpdating) {
              bufferQueue.push(event.data)
            } else {
              try {
                isUpdating = true
                sourceBuffer.appendBuffer(event.data)
                if (state !== 'playing') setState('playing')
              } catch {
                bufferQueue.push(event.data)
              }
            }

            // Auto-play when we get data
            if (video.paused) {
              video.play().catch(() => {})
            }
          }
        }

        ws.onopen = () => {
          // Request MSE stream
          ws.send(JSON.stringify({ type: 'mse', value: '' }))
        }

        ws.onerror = () => {
          setState('error')
        }

        ws.onclose = () => {
          if (state === 'playing') {
            // Try to reconnect after a delay
            setTimeout(connect, 3000)
          }
        }
      })
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (msRef.current && msRef.current.readyState === 'open') {
        try {
          msRef.current.endOfStream()
        } catch {
          // Ignore
        }
      }
      if (video.src) {
        URL.revokeObjectURL(video.src)
        video.src = ''
      }
    }
  }, [name, rtspUrl, go2rtcUrl])

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {state === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-primary/80">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <span className="text-xs text-text-muted">Conectando...</span>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-primary/80">
          <WifiOff className="w-8 h-8 text-danger opacity-60" />
          <span className="text-xs text-text-muted text-center px-4">
            Falha na conexao com go2rtc
          </span>
        </div>
      )}
    </div>
  )
}
