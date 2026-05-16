import { useState, useEffect } from 'react'
import { Grid2x2, Grid3x3, LayoutGrid, Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Camera } from '../lib/types'
import Button from '../components/ui/Button'
import CameraViewer from '../components/ui/CameraViewer'

type GridLayout = '2x2' | '3x3' | '4x4'

const gridCols: Record<GridLayout, string> = {
  '2x2': 'grid-cols-1 sm:grid-cols-2',
  '3x3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4x4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

export default function ViewerPage() {
  const [layout, setLayout] = useState<GridLayout>('2x2')
  const [cameras, setCameras] = useState<Camera[]>([])

  useEffect(() => {
    supabase
      .from('cameras')
      .select('id, name, location, status, rtsp_url, brand, ip_address, channel_number, streaming_user, streaming_password')
      .eq('status', 'ativo')
      .order('name')
      .then(({ data }) => setCameras((data as Camera[]) || []))
  }, [])

  const cellCount = layout === '2x2' ? 4 : layout === '3x3' ? 9 : 16
  const cells = Array.from({ length: cellCount }, (_, i) => cameras[i] ?? null)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Visualização</h2>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">Monitoramento de câmeras em tempo real</p>
        </div>
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

      <div className={`grid ${gridCols[layout]} gap-2 sm:gap-3`}>
        {cells.map((camera, index) => (
          <div
            key={camera?.id ?? `empty-${index}`}
            data-camera-id={camera?.id}
            className="relative bg-bg-secondary border border-border-light rounded-xl aspect-video flex flex-col items-center justify-center overflow-hidden group"
          >
            {camera && (
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                <span className="text-[10px] sm:text-xs font-medium text-text-primary bg-black/50 px-1.5 sm:px-2 py-0.5 rounded truncate max-w-[60%]">
                  {camera.name}
                </span>
                {camera.rtsp_url && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs bg-black/50 px-1.5 sm:px-2 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                    <span className="text-danger font-medium hidden sm:inline">AO VIVO</span>
                  </span>
                )}
              </div>
            )}

            {camera?.rtsp_url || camera?.ip_address ? (
              <CameraViewer
                cameraName={camera.name}
                streamUrl={camera.rtsp_url}
                deviceIp={camera.ip_address}
                channelNumber={camera.channel_number}
                dvrBrand={camera.brand}
                streamUser={camera.streaming_user}
                streamPass={camera.streaming_password}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 sm:gap-3 text-text-muted">
                <Monitor className="w-6 h-6 sm:w-10 sm:h-10 opacity-30" />
                <span className="text-[10px] sm:text-xs text-center px-2 sm:px-4">
                  {camera
                    ? 'Sem URL RTSP'
                    : 'Sem câmera'}
                </span>
              </div>
            )}

            {camera?.location && (
              <div className="absolute bottom-2 left-2 z-10">
                <span className="text-[10px] text-text-muted bg-black/50 px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[200px] inline-block">
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
