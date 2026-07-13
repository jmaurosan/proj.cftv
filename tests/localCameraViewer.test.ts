import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLocalCameraStreams,
  buildMediaMtxDownloadFilename,
  buildMediaMtxConfig,
  buildLocalViewerStorageKey,
  formatMediaMtxAgentHealth,
  buildRtspSource,
  buildWebRtcUrl,
  getLiveViewLayoutLimit,
  getReadyLiveViewStreams,
  getVisibleLiveViewStreams,
  sanitizeStreamName,
} from '../src/lib/localCameraViewer.ts'
import type { Camera, Dvr } from '../src/lib/types.ts'

const baseCamera = (overrides: Partial<Camera> = {}): Camera => ({
  id: 'cam-1',
  name: 'Câmera Portaria',
  brand: null,
  technology: null,
  connection_type: 'analog',
  dvr_id: null,
  channel_number: null,
  ip_address: null,
  mac_address: null,
  poe_powered: false,
  power_source_type: null,
  power_supply_voltage: null,
  power_supply_current_a: null,
  power_supply_brand: null,
  power_supply_model: null,
  location: 'Entrada',
  type: 'bullet',
  status: 'active',
  resolution: null,
  rtsp_url: null,
  streaming_user: null,
  streaming_password: null,
  media_mtx_stream_name: null,
  balun_id: null,
  balun_port: null,
  switch_id: null,
  switch_port: null,
  qr_code_url: null,
  installation_photo_url: null,
  notes: null,
  client_id: 'client-1',
  user_id: 'user-1',
  created_at: '2026-06-25T00:00:00Z',
  updated_at: '2026-06-25T00:00:00Z',
  ...overrides,
})

const baseDvr = (overrides: Partial<Dvr> = {}): Dvr => ({
  id: 'dvr-1',
  name: 'DVR Principal',
  brand: null,
  ip_address: '192.168.1.100',
  model: null,
  location: 'Rack',
  total_channels: 16,
  hd_capacity_tb: null,
  hd_brand: null,
  hd_model: null,
  status: 'active',
  username: 'admin',
  password: 'senha 123',
  notes: null,
  client_id: 'client-1',
  user_id: 'user-1',
  created_at: '2026-06-25T00:00:00Z',
  updated_at: '2026-06-25T00:00:00Z',
  ...overrides,
})

test('sanitizeStreamName removes accents and adds channel when available', () => {
  const result = sanitizeStreamName(baseCamera({ channel_number: 4 }), 0)

  assert.equal(result, 'camera-portaria-ch-4')
})

test('buildWebRtcUrl formats the local MediaMTX player URL', () => {
  const result = buildWebRtcUrl({ serverIp: '192.168.1.50/', webrtcPort: '' }, 'cam1')

  assert.equal(result, 'http://192.168.1.50:8889/cam1')
})

test('buildRtspSource prefers explicit camera RTSP URL', () => {
  const camera = baseCamera({ rtsp_url: ' rtsp://camera.local/live ' })

  assert.equal(buildRtspSource(camera, baseDvr()), 'rtsp://camera.local/live')
})

test('buildRtspSource falls back to DVR channel URL with encoded credentials', () => {
  const camera = baseCamera({ dvr_id: 'dvr-1', channel_number: 7 })

  assert.equal(
    buildRtspSource(camera, baseDvr()),
    'rtsp://admin:senha%20123@192.168.1.100:554/cam/realmonitor?channel=7&subtype=1'
  )
})

test('buildRtspSource creates direct IP camera URL when camera is not linked to a DVR', () => {
  const camera = baseCamera({
    connection_type: 'ip',
    ip_address: '192.168.0.130',
    streaming_user: 'admin',
    streaming_password: 'senha @123',
  })

  assert.equal(
    buildRtspSource(camera, null),
    'rtsp://admin:senha%20%40123@192.168.0.130:554/cam/realmonitor?channel=1&subtype=1'
  )
})

test('buildLocalCameraStreams marks cameras without a usable RTSP source', () => {
  const [stream] = buildLocalCameraStreams([baseCamera()], [], {
    serverIp: '192.168.1.50',
    webrtcPort: '8889',
  })

  assert.equal(stream.sourceUrl, null)
  assert.equal(stream.configBlock, null)
  assert.equal(stream.warnings.length, 1)
})

test('buildLocalCameraStreams uses custom MediaMTX stream name when present', () => {
  const [stream] = buildLocalCameraStreams(
    [baseCamera({
      media_mtx_stream_name: ' Sala ',
      rtsp_url: 'rtsp://admin:monet102030@192.168.0.130:554/cam/realmonitor?channel=1&subtype=1',
    })],
    [],
    { serverIp: '192.168.0.182', webrtcPort: '8889' }
  )

  assert.equal(stream.streamName, 'sala')
  assert.equal(stream.playerUrl, 'http://192.168.0.182:8889/sala')
  assert.equal(
    stream.configBlock,
    '  sala:\n    source: rtsp://admin:monet102030@192.168.0.130:554/cam/realmonitor?channel=1&subtype=1\n    rtspTransport: tcp'
  )
})

test('buildMediaMtxConfig creates a copyable paths block', () => {
  const streams = buildLocalCameraStreams(
    [baseCamera({ dvr_id: 'dvr-1', channel_number: 1 })],
    [baseDvr()],
    { serverIp: '192.168.1.50', webrtcPort: '8889' }
  )

  assert.equal(
    buildMediaMtxConfig(streams),
    [
      'paths:',
      '  camera-portaria-ch-1:',
      '    source: rtsp://admin:senha%20123@192.168.1.100:554/cam/realmonitor?channel=1&subtype=1',
      '    rtspTransport: tcp',
    ].join('\n')
  )
})

test('buildLocalCameraStreams includes TCP transport in MediaMTX path blocks', () => {
  const [stream] = buildLocalCameraStreams(
    [baseCamera({ rtsp_url: 'rtsp://admin:senha@192.168.0.211:554/live' })],
    [],
    { serverIp: '192.168.0.182', webrtcPort: '8889' }
  )

  assert.equal(
    stream.configBlock,
    [
      '  camera-portaria:',
      '    source: rtsp://admin:senha@192.168.0.211:554/live',
      '    rtspTransport: tcp',
    ].join('\n')
  )
})

test('buildMediaMtxDownloadFilename creates a safe YAML filename for the selected client', () => {
  assert.equal(buildMediaMtxDownloadFilename('Condomínio Solar Norte'), 'mediamtx-condominio-solar-norte.yml')
  assert.equal(buildMediaMtxDownloadFilename(null), 'mediamtx.yml')
})

test('getLiveViewLayoutLimit returns the number of slots for each mosaic layout', () => {
  assert.equal(getLiveViewLayoutLimit('2x2'), 4)
  assert.equal(getLiveViewLayoutLimit('3x3'), 9)
  assert.equal(getLiveViewLayoutLimit('4x4'), 16)
})

test('getReadyLiveViewStreams keeps only streams with source and player URLs', () => {
  const streams = buildLocalCameraStreams(
    [
      baseCamera({ id: 'cam-1', dvr_id: 'dvr-1', channel_number: 1 }),
      baseCamera({ id: 'cam-2', name: 'Sem RTSP' }),
      baseCamera({ id: 'cam-3', name: 'Sem servidor', rtsp_url: 'rtsp://camera.local/live' }),
    ],
    [baseDvr()],
    { serverIp: '', webrtcPort: '8889' }
  )

  assert.deepEqual(getReadyLiveViewStreams(streams).map((stream) => stream.camera.id), [])

  const streamsWithServer = buildLocalCameraStreams(
    [
      baseCamera({ id: 'cam-1', dvr_id: 'dvr-1', channel_number: 1 }),
      baseCamera({ id: 'cam-2', name: 'Sem RTSP' }),
      baseCamera({ id: 'cam-3', name: 'IP Direta', rtsp_url: 'rtsp://camera.local/live' }),
    ],
    [baseDvr()],
    { serverIp: '192.168.1.50', webrtcPort: '8889' }
  )

  assert.deepEqual(getReadyLiveViewStreams(streamsWithServer).map((stream) => stream.camera.id), ['cam-1', 'cam-3'])
})

test('getVisibleLiveViewStreams limits the mosaic to the selected layout capacity', () => {
  const streams = buildLocalCameraStreams(
    Array.from({ length: 6 }, (_, index) =>
      baseCamera({
        id: `cam-${index + 1}`,
        name: `Camera ${index + 1}`,
        rtsp_url: `rtsp://camera-${index + 1}.local/live`,
      })
    ),
    [],
    { serverIp: '192.168.1.50', webrtcPort: '8889' }
  )

  assert.deepEqual(
    getVisibleLiveViewStreams(streams, '2x2').map((stream) => stream.camera.id),
    ['cam-1', 'cam-2', 'cam-3', 'cam-4']
  )
})

test('buildLocalViewerStorageKey scopes MediaMTX settings by client', () => {
  assert.equal(
    buildLocalViewerStorageKey('server-ip', 'client-a'),
    'cftv-local-viewer:client-a:server-ip'
  )
  assert.equal(
    buildLocalViewerStorageKey('server-ip', 'client-b'),
    'cftv-local-viewer:client-b:server-ip'
  )
  assert.equal(
    buildLocalViewerStorageKey('layout', null),
    'cftv-local-viewer:all-clients:layout'
  )
  assert.equal(
    buildLocalViewerStorageKey('agent-url', 'client-a'),
    'cftv-local-viewer:client-a:agent-url'
  )
  assert.equal(
    buildLocalViewerStorageKey('agent-token', 'client-a'),
    'cftv-local-viewer:client-a:agent-token'
  )
})

test('formatMediaMtxAgentHealth summarizes health responses from the local agent', () => {
  const result = formatMediaMtxAgentHealth({
    ok: true,
    service: 'cftv-mediamtx-agent',
    configPath: 'C:\\Users\\Mauro\\Desktop\\MediaMTX\\mediamtx.yml',
    allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  })

  assert.equal(result.online, true)
  assert.equal(result.configPath, 'C:\\Users\\Mauro\\Desktop\\MediaMTX\\mediamtx.yml')
  assert.equal(result.allowedOriginsText, 'http://localhost:5173, http://127.0.0.1:5173')
})

test('formatMediaMtxAgentHealth treats invalid health responses as offline', () => {
  const result = formatMediaMtxAgentHealth({ ok: false })

  assert.equal(result.online, false)
  assert.equal(result.configPath, null)
  assert.equal(result.allowedOriginsText, 'Nenhuma origem informada')
})
