import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCameraStorage, calculateRequiredStorageTb, calculateRetentionDays, estimateBitrateKbps } from '../src/lib/recordingStorage.ts'

test('estima bitrate por resolução, codec e FPS', () => {
  assert.equal(estimateBitrateKbps({ resolution: '1080p', recording_codec: 'h265', recording_fps: 15 }), 2048)
  assert.equal(estimateBitrateKbps({ resolution: '4K', recording_codec: 'h264', recording_fps: 30 }), 24576)
})

test('bitrate manual tem prioridade e movimento reduz consumo', () => {
  const result = calculateCameraStorage({ recording_bitrate_kbps: 4000, recording_mode: 'motion', motion_recording_percent: 25 })
  assert.equal(result.bitrateSource, 'manual')
  assert.equal(result.activityFactor, 0.25)
  assert.equal(result.gbPerDay, 10.8)
})

test('calcula armazenamento total e retenção com reserva', () => {
  const cameras = [
    { recording_bitrate_kbps: 2000, recording_mode: 'continuous' as const },
    { recording_bitrate_kbps: 2000, recording_mode: 'continuous' as const },
  ]
  assert.equal(calculateRequiredStorageTb(cameras, 30), 1.3)
  assert.equal(calculateRetentionDays(cameras, 2, 10), 41.7)
})
