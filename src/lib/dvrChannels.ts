/**
 * Classifica um channel_number de uma câmera vinculada a DVR.
 *
 * Prioridade:
 *   1) Tipo declarado da câmera (connection_type) — fonte da verdade
 *   2) Posição do canal, considerando disabled_analog_channels:
 *      - canal em disabled_analog_channels          → 'ip' (Enhanced IP Mode)
 *      - [1..analog_channels]                       → 'bnc'
 *      - [analog+1..total]                          → 'ip'
 */
export function classifyDvrChannel(
  channelNumber: number | null | undefined,
  analogChannels: number | null | undefined,
  connectionType?: string | null,
  disabledAnalogChannels?: number[] | null,
): 'bnc' | 'ip' | 'unknown' {
  if (channelNumber == null) return 'unknown'
  // Prioridade 1: tipo declarado da câmera é a verdade
  if (connectionType === 'ip' || connectionType === 'wifi') return 'ip'
  if (connectionType === 'analogica') return 'bnc'
  // Prioridade 2: posição, respeitando canais convertidos BNC→IP
  if (disabledAnalogChannels?.includes(channelNumber)) return 'ip'
  if (analogChannels != null) {
    return channelNumber <= analogChannels ? 'bnc' : 'ip'
  }
  return 'unknown'
}

/**
 * Retorna os canais disponíveis do DVR para uma câmera de tipo específico.
 *
 * Para câmera analógica: canais [1..analog_channels] EXCETO disabled.
 * Para câmera IP/Wi-Fi:   canais em disabled UNIÃO [analog+1..total].
 */
export function getAvailableChannels(
  cameraKind: 'analogica' | 'ip' | 'wifi',
  analogChannels: number,
  ipChannels: number,
  disabledAnalogChannels: number[],
): number[] {
  const disabled = new Set(disabledAnalogChannels)
  const total = analogChannels + ipChannels
  const list: number[] = []
  if (cameraKind === 'analogica') {
    for (let ch = 1; ch <= analogChannels; ch++) {
      if (!disabled.has(ch)) list.push(ch)
    }
  } else {
    // IP: canais BNC convertidos + IPs extras
    for (let ch = 1; ch <= analogChannels; ch++) {
      if (disabled.has(ch)) list.push(ch)
    }
    for (let ch = analogChannels + 1; ch <= total; ch++) {
      list.push(ch)
    }
  }
  return list
}

export function channelKindLabel(kind: 'bnc' | 'ip' | 'unknown'): string {
  if (kind === 'bnc') return 'BNC'
  if (kind === 'ip') return 'IP'
  return ''
}

export type CameraChannelDiagnostic = {
  code: 'missing_dvr' | 'missing_channel' | 'unknown_dvr' | 'out_of_range' | 'ip_on_bnc' | 'analog_on_ip'
  message: string
}

type CameraChannelInput = {
  connection_type?: string | null
  dvr_id?: string | null
  channel_number?: number | null
}

type DvrChannelInput = {
  id: string
  name?: string | null
  total_channels?: number | null
  analog_channels?: number | null
  ip_channels?: number | null
  disabled_analog_channels?: number[] | null
}

export function getCameraChannelDiagnostics(
  camera: CameraChannelInput,
  dvr?: DvrChannelInput,
): CameraChannelDiagnostic[] {
  const issues: CameraChannelDiagnostic[] = []
  const isNetwork = camera.connection_type === 'ip' || camera.connection_type === 'wifi'

  if (!camera.dvr_id) {
    if (camera.connection_type === 'analogica') {
      issues.push({ code: 'missing_dvr', message: 'Câmera analógica sem DVR.' })
    }
    return issues
  }
  if (!dvr) return [{ code: 'unknown_dvr', message: 'DVR vinculado não foi encontrado.' }]
  if (camera.channel_number == null) return [{ code: 'missing_channel', message: 'DVR informado sem número de canal.' }]

  const analog = dvr.analog_channels ?? dvr.total_channels ?? 0
  const total = analog + (dvr.ip_channels ?? 0)
  if (camera.channel_number < 1 || (total > 0 && camera.channel_number > total)) {
    issues.push({ code: 'out_of_range', message: `Canal ${camera.channel_number} fora da capacidade de ${dvr.name || 'DVR'}.` })
    return issues
  }

  const configuredKind = dvr.disabled_analog_channels?.includes(camera.channel_number)
    || camera.channel_number > analog
    ? 'ip'
    : 'bnc'
  if (isNetwork && configuredKind === 'bnc') {
    issues.push({ code: 'ip_on_bnc', message: `Câmera ${camera.connection_type === 'wifi' ? 'Wi-Fi' : 'IP'} em canal BNC.` })
  } else if (!isNetwork && configuredKind === 'ip') {
    issues.push({ code: 'analog_on_ip', message: 'Câmera analógica em canal configurado como IP.' })
  }
  return issues
}
