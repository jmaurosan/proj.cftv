import type { Camera, Dvr } from './types'

export interface LocalViewerSettings {
  serverIp: string
  webrtcPort: string
}

export interface LocalCameraStream {
  camera: Camera
  dvr: Dvr | null
  streamName: string
  sourceUrl: string | null
  playerUrl: string
  configBlock: string | null
  warnings: string[]
}

export interface MediaMtxAgentHealth {
  ok?: boolean
  service?: string
  configPath?: string
  allowedOrigins?: string[]
}

export interface MediaMtxAgentHealthSummary {
  online: boolean
  configPath: string | null
  allowedOriginsText: string
}

export type LiveViewLayout = '2x2' | '3x3' | '4x4'
export type LocalViewerStorageSetting = 'server-ip' | 'webrtc-port' | 'layout' | 'agent-url' | 'agent-token'

const DEFAULT_WEBRTC_PORT = '8889'
const DEFAULT_RTSP_PORT = '554'
const LOCAL_VIEWER_STORAGE_PREFIX = 'cftv-local-viewer'
const LOCAL_VIEWER_ALL_CLIENTS_SCOPE = 'all-clients'

const LIVE_VIEW_LAYOUT_LIMITS: Record<LiveViewLayout, number> = {
  '2x2': 4,
  '3x3': 9,
  '4x4': 16,
}

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const sanitizeSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const sanitizeFileSegment = (value: string) => sanitizeSegment(value) || 'cliente'

const encodeRtspCredential = (value: string | null | undefined) =>
  value ? encodeURIComponent(value) : ''

const buildAuthPrefix = (username?: string | null, password?: string | null) => {
  const encodedUser = encodeRtspCredential(username || 'admin')
  const encodedPassword = encodeRtspCredential(password || '')
  if (encodedPassword) return `${encodedUser}:${encodedPassword}@`
  return encodedUser ? `${encodedUser}@` : ''
}

export const sanitizeStreamName = (camera: Pick<Camera, 'name' | 'channel_number' | 'id'>, index: number) => {
  const base = sanitizeSegment(camera.name) || `camera-${index + 1}`
  const channel = camera.channel_number ? `ch-${camera.channel_number}` : ''
  return [base, channel].filter(Boolean).join('-')
}

const getStreamName = (camera: Camera, index: number) => {
  const customName = sanitizeSegment(camera.media_mtx_stream_name?.trim() ?? '')
  return customName || sanitizeStreamName(camera, index)
}

export const buildWebRtcUrl = (settings: LocalViewerSettings, streamName: string) => {
  const ip = settings.serverIp.trim()
  const port = settings.webrtcPort.trim() || DEFAULT_WEBRTC_PORT
  if (!ip) return ''
  return `http://${stripTrailingSlash(ip)}:${port}/${streamName}`
}

export const buildRtspSource = (camera: Camera, dvr: Dvr | null) => {
  if (camera.rtsp_url?.trim()) return camera.rtsp_url.trim()

  if (camera.ip_address?.trim() && !camera.dvr_id) {
    const auth = buildAuthPrefix(camera.streaming_user, camera.streaming_password)
    return `rtsp://${auth}${camera.ip_address.trim()}:${DEFAULT_RTSP_PORT}/cam/realmonitor?channel=1&subtype=1`
  }

  const channel = camera.channel_number
  if (!dvr?.ip_address || !channel) return null

  const auth = buildAuthPrefix(camera.streaming_user || dvr.username, camera.streaming_password || dvr.password)
  return `rtsp://${auth}${dvr.ip_address}:${DEFAULT_RTSP_PORT}/cam/realmonitor?channel=${channel}&subtype=1`
}

export const buildLocalCameraStreams = (
  cameras: Camera[],
  dvrs: Dvr[],
  settings: LocalViewerSettings
): LocalCameraStream[] => {
  const dvrById = new Map(dvrs.map((dvr) => [dvr.id, dvr]))
  const usedNames = new Map<string, number>()

  return cameras.map((camera, index) => {
    const dvr = camera.dvr_id ? dvrById.get(camera.dvr_id) ?? null : null
    const baseName = getStreamName(camera, index)
    const duplicateCount = usedNames.get(baseName) ?? 0
    usedNames.set(baseName, duplicateCount + 1)
    const streamName = duplicateCount > 0 ? `${baseName}-${duplicateCount + 1}` : baseName
    const sourceUrl = buildRtspSource(camera, dvr)
    const warnings: string[] = []

    if (!sourceUrl) {
      warnings.push('Cadastre IP/credenciais da câmera, uma URL RTSP ou vincule a câmera a um DVR com IP e canal.')
    }

    return {
      camera,
      dvr,
      streamName,
      sourceUrl,
      playerUrl: buildWebRtcUrl(settings, streamName),
      configBlock: sourceUrl ? `  ${streamName}:\n    source: ${sourceUrl}\n    rtspTransport: tcp` : null,
      warnings,
    }
  })
}

export const buildMediaMtxConfig = (streams: LocalCameraStream[]) => {
  const blocks = streams
    .map((stream) => stream.configBlock)
    .filter((block): block is string => Boolean(block))

  if (blocks.length === 0) return ''

  return ['paths:', ...blocks].join('\n')
}

export const getLiveViewLayoutLimit = (layout: LiveViewLayout) => LIVE_VIEW_LAYOUT_LIMITS[layout]

export const getReadyLiveViewStreams = (streams: LocalCameraStream[]) =>
  streams.filter((stream) => Boolean(stream.sourceUrl && stream.playerUrl))

export const getVisibleLiveViewStreams = (streams: LocalCameraStream[], layout: LiveViewLayout) =>
  getReadyLiveViewStreams(streams).slice(0, getLiveViewLayoutLimit(layout))

export const buildLocalViewerStorageKey = (setting: LocalViewerStorageSetting, clientId: string | null | undefined) =>
  `${LOCAL_VIEWER_STORAGE_PREFIX}:${clientId || LOCAL_VIEWER_ALL_CLIENTS_SCOPE}:${setting}`

export const buildMediaMtxDownloadFilename = (clientName: string | null | undefined) =>
  clientName ? `mediamtx-${sanitizeFileSegment(clientName)}.yml` : 'mediamtx.yml'

export const formatMediaMtxAgentHealth = (health: MediaMtxAgentHealth): MediaMtxAgentHealthSummary => {
  const allowedOrigins = Array.isArray(health.allowedOrigins) ? health.allowedOrigins : []

  return {
    online: Boolean(health.ok),
    configPath: health.ok && health.configPath ? health.configPath : null,
    allowedOriginsText: allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'Nenhuma origem informada',
  }
}
