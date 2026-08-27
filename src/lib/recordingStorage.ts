export type RecordingCodec = 'h264' | 'h265' | 'h265_plus'
export type RecordingMode = 'continuous' | 'motion'

export interface RecordingStorageInput {
  resolution?: string | null
  recording_codec?: RecordingCodec | null
  recording_fps?: number | null
  recording_bitrate_kbps?: number | null
  recording_mode?: RecordingMode | null
  motion_recording_percent?: number | null
}

export interface CameraStorageEstimate {
  bitrateKbps: number
  bitrateSource: 'manual' | 'estimated'
  activityFactor: number
  gbPerDay: number
}

const BASE_H264_KBPS: Record<string, number> = {
  '720p': 2048,
  '1080p': 4096,
  '2k': 6144,
  '3mp': 5120,
  '4mp': 6144,
  '5mp': 8192,
  '6mp': 9216,
  '4k': 12288,
  '8mp': 12288,
}

const CODEC_FACTOR: Record<RecordingCodec, number> = {
  h264: 1,
  h265: 0.5,
  h265_plus: 0.375,
}

const normalizeResolution = (resolution?: string | null) =>
  (resolution || '1080p').trim().toLowerCase().replace(/\s+/g, '')

export function estimateBitrateKbps(input: RecordingStorageInput): number {
  const resolution = normalizeResolution(input.resolution)
  const base = BASE_H264_KBPS[resolution] ?? BASE_H264_KBPS['1080p']
  const codec = input.recording_codec || 'h265'
  const fps = Math.min(60, Math.max(1, input.recording_fps || 15))
  const fpsFactor = Math.max(0.4, fps / 15)
  return Math.round(base * CODEC_FACTOR[codec] * fpsFactor)
}

export function calculateCameraStorage(input: RecordingStorageInput): CameraStorageEstimate {
  const manualBitrate = Number(input.recording_bitrate_kbps || 0)
  const bitrateKbps = manualBitrate > 0 ? manualBitrate : estimateBitrateKbps(input)
  const mode = input.recording_mode || 'continuous'
  const motionPercent = Math.min(100, Math.max(1, input.motion_recording_percent || 35))
  const activityFactor = mode === 'motion' ? motionPercent / 100 : 1
  const gbPerDay = Math.round(bitrateKbps * 0.0108 * activityFactor * 100) / 100
  return {
    bitrateKbps,
    bitrateSource: manualBitrate > 0 ? 'manual' : 'estimated',
    activityFactor,
    gbPerDay,
  }
}

export function calculateRequiredStorageTb(inputs: RecordingStorageInput[], days: number): number {
  const totalGb = inputs.reduce((sum, input) => sum + calculateCameraStorage(input).gbPerDay * Math.max(0, days), 0)
  return Math.round((totalGb / 1000) * 100) / 100
}

export function calculateRetentionDays(inputs: RecordingStorageInput[], installedTb: number, reservePercent = 10): number | null {
  const dailyGb = inputs.reduce((sum, input) => sum + calculateCameraStorage(input).gbPerDay, 0)
  if (dailyGb <= 0 || installedTb <= 0) return null
  const usableGb = installedTb * 1000 * (1 - Math.min(50, Math.max(0, reservePercent)) / 100)
  return Math.round((usableGb / dailyGb) * 10) / 10
}

export const formatCodec = (codec?: RecordingCodec | null) =>
  codec === 'h264' ? 'H.264' : codec === 'h265_plus' ? 'H.265+' : 'H.265'
