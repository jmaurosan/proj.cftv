import { useState, useEffect } from 'react'
import { Monitor, Grid2x2, Grid3x3, LayoutGrid, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Camera } from '../lib/types'
import Button from '../components/ui/Button'
import CameraPlayer from '../components/ui/CameraPlayer'

type GridLayout = '2x2' | '3x3' | '4x4'

const gridCols: Record<GridLayout, string> = {
  '2x2': 'grid-cols-2',
  '3x3': 'grid-cols-3',
  '4x4': 'grid-cols-4',
}

const DEFAULT_GO2RTC_URL = import.meta.env.VITE_GO2RTC_URL || 'http://localhost:1984'

export default function ViewerPage() {
  const [layout, setLayout] = useState<GridLayout>('2x2')
  const [cameras, setCameras] = useState<Camera[]>([])
  const [go2rtcUrl, setGo2rtcUrl] = useState(() => {
    return localStorage.getItem('go2rtc_url') || DEFAULT_GO2RTC_URL
  })
  const [showSettings, setShowSettings] = useState(false)
  const [tempUrl, setTempUrl] = useState(go2rtcUrl)

  useEffect(() => {
    supabase
      .from('cameras')
      .select('id, name, location, status, rtsp_url')
      .eq('status', 'ativo')
      .order('name')
      .then(({ data }) => setCameras((data as Camera[]) || []))
  }, [])

  const saveGo2rtcUrl = () => {
    setGo2rtcUrl(tempUrl)
    localStorage.setItem('go2rtc_url', tempUrl)
    setShowSettings(false)
  }

  const cellCount = layout === '2x2' ? 4 : layout === '3x3' ? 9 : 16
  const cells = Array.from({ length: cellCount }, (_, i) => cameras[i] ?? null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Visualização</h2>
          <p className="text-text-muted text-sm mt-1">Monitoramento de câmeras em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTempUrl(go2rtcUrl)
              setShowSettings(!showSettings)
            }}
            title="Configurar go2rtc"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-light rounded-lg p-1">
            <Button
              variant={layout === '2x2' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('2x2')}
              title="2x2"
            >
              <Grid2x2 className="w-4 h-4" />
            </Button>
            <Button
              variant={layout === '3x3' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('3x3')}
              title="3x3"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={layout === '4x4' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('4x4')}
              title="4x4"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="bg-bg-secondary border border-border-light rounded-xl p-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Endereço do go2rtc
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="http://192.168.1.100:1984"
              className="flex-1 px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <Button size="sm" onClick={saveGo2rtcUrl}>
              Salvar
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Use o IP da maquina onde o go2rtc esta rodando. Ex: http://192.168.1.100:1984
          </p>
        </div>
      )}

      <div className={`grid ${gridCols[layout]} gap-3`}>
        {cells.map((camera, index) => (
          <div
            key={camera?.id ?? `empty-${index}`}
            data-camera-id={camera?.id}
            className="relative bg-bg-secondary border border-border-light rounded-xl aspect-video flex flex-col items-center justify-center overflow-hidden group"
          >
            {camera && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <span className="text-xs font-medium text-text-primary bg-black/50 px-2 py-0.5 rounded">
                  {camera.name}
                </span>
                {camera.rtsp_url && (
                  <span className="flex items-center gap-1.5 text-xs bg-black/50 px-2 py-0.5 rounded">
                    <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                    <span className="text-danger font-medium">AO VIVO</span>
                  </span>
                )}
              </div>
            )}

            {camera?.rtsp_url ? (
              <CameraPlayer
                name={camera.name}
                rtspUrl={camera.rtsp_url}
                go2rtcUrl={go2rtcUrl}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-text-muted">
                <Monitor className="w-10 h-10 opacity-30" />
                <span className="text-xs text-center px-4">
                  {camera
                    ? 'Sem URL RTSP configurada'
                    : 'Sem câmera atribuída'}
                </span>
              </div>
            )}

            {camera?.location && (
              <div className="absolute bottom-3 left-3 z-10">
                <span className="text-xs text-text-muted bg-black/50 px-2 py-0.5 rounded">
                  {camera.location}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
