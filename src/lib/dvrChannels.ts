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
