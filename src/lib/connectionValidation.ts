export interface CameraConnectionRecord {
  id?: string
  name?: string | null
  ip_address?: string | null
  dvr_id?: string | null
  dvr_name?: string | null
  dvrs?: { name?: string | null } | { name?: string | null }[] | null
  channel_number?: number | null
  balun_id?: string | null
  balun_port?: number | null
  switch_id?: string | null
  switch_port?: number | null
}

export interface DvrRecord {
  id?: string
  name?: string | null
  ip_address?: string | null
}

export interface PortAssignment {
  port_number: number
  target_id?: string | null
  target_name?: string | null
}

const normalize = (value: string | null | undefined) => value?.trim().toLocaleLowerCase('pt-BR') || ''

const getDvrName = (camera: CameraConnectionRecord) => {
  if (camera.dvr_name) return camera.dvr_name
  const dvr = Array.isArray(camera.dvrs) ? camera.dvrs[0] : camera.dvrs
  return dvr?.name || null
}

export const formatCameraRegistrationLocation = (camera: CameraConnectionRecord) => {
  const dvrName = getDvrName(camera)
  if (dvrName && camera.channel_number != null) return `${dvrName} CH ${camera.channel_number}`
  if (dvrName) return dvrName
  if (camera.channel_number != null) return `CH ${camera.channel_number}`
  return null
}

export function validateCameraConflicts(
  cameras: CameraConnectionRecord[],
  candidate: CameraConnectionRecord,
  editingId?: string,
  options: { allowDvrChannelConflict?: boolean } = {},
) {
  const others = cameras.filter((camera) => camera.id !== editingId)
  const sameName = candidate.name && others.find((camera) => normalize(camera.name) === normalize(candidate.name))
  if (sameName) {
    const registrationLocation = formatCameraRegistrationLocation(sameName)
    if (registrationLocation) {
      return `A câmera "${sameName.name}" já está cadastrada em ${registrationLocation}. Deseja substituir?`
    }
    return `Já existe a câmera "${sameName.name}" cadastrada neste cliente.`
  }

  const sameIp = candidate.ip_address && others.find((camera) => normalize(camera.ip_address) === normalize(candidate.ip_address))
  if (sameIp) return `O endereço IP ${candidate.ip_address} já está sendo utilizado pela câmera "${sameIp.name}".`

  const sameDvrChannel = candidate.dvr_id && candidate.channel_number != null && others.find((camera) => (
    camera.dvr_id === candidate.dvr_id && camera.channel_number === candidate.channel_number
  ))
  if (sameDvrChannel && !options.allowDvrChannelConflict) {
    return `O canal ${candidate.channel_number} deste DVR já está sendo utilizado pela câmera "${sameDvrChannel.name}".`
  }

  const sameBalunPort = candidate.balun_id && candidate.balun_port != null && others.find((camera) => (
    camera.balun_id === candidate.balun_id && camera.balun_port === candidate.balun_port
  ))
  if (sameBalunPort) return `A porta ${candidate.balun_port} do Power Balun já está sendo utilizada pela câmera "${sameBalunPort.name}".`

  const sameSwitchPort = candidate.switch_id && candidate.switch_port != null && others.find((camera) => (
    camera.switch_id === candidate.switch_id && camera.switch_port === candidate.switch_port
  ))
  if (sameSwitchPort) return `A porta ${candidate.switch_port} do switch já está sendo utilizada pela câmera "${sameSwitchPort.name}".`

  return null
}

export function validateDvrConflicts(dvrs: DvrRecord[], candidate: DvrRecord, editingId?: string) {
  const others = dvrs.filter((dvr) => dvr.id !== editingId)
  const sameName = candidate.name && others.find((dvr) => normalize(dvr.name) === normalize(candidate.name))
  if (sameName) return `Já existe o DVR "${sameName.name}" cadastrado neste cliente.`

  const sameIp = candidate.ip_address && others.find((dvr) => normalize(dvr.ip_address) === normalize(candidate.ip_address))
  if (sameIp) return `O endereço IP ${candidate.ip_address} já está sendo utilizado pelo DVR "${sameIp.name}".`

  return null
}

export function validatePortAssignment(
  ports: PortAssignment[],
  candidate: PortAssignment,
  deviceLabel: string,
) {
  if (!candidate.target_id) return null
  const currentPort = ports.find((port) => port.port_number === candidate.port_number)
  if (currentPort?.target_id && currentPort.target_id !== candidate.target_id) {
    return `A porta ${candidate.port_number} do ${deviceLabel} já está sendo utilizada por "${currentPort.target_name || 'outro dispositivo'}".`
  }

  const otherPort = ports.find((port) => (
    port.port_number !== candidate.port_number && port.target_id === candidate.target_id
  ))
  if (otherPort) {
    return `Este dispositivo já está conectado à porta ${otherPort.port_number} do ${deviceLabel}. Remova a conexão anterior primeiro.`
  }

  return null
}
