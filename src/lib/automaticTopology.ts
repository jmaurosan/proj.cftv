export type AutomaticTopologyNodeType = 'internet' | 'router' | 'switch' | 'dvr' | 'camera' | 'camera-group' | 'rack' | 'balun' | 'monitor'

export interface AutomaticTopologyNode {
  id: string
  type: AutomaticTopologyNodeType
  status: string
}

export interface AutomaticTopologyConnection {
  id: string
  source: string
  target: string
  active: boolean
  label?: string
  style: 'dashed'
  medium: 'wan' | 'lan' | 'poe' | 'coaxial' | 'utp-video' | 'video'
}

export interface AutomaticCameraConnection {
  id: string
  status: string
  connection_type?: string | null
  switch_id?: string | null
  switch_port?: number | null
  dvr_id?: string | null
  channel_number?: number | null
  balun_id?: string | null
  balun_port?: number | null
}

export interface AutomaticSwitchPort {
  switch_id: string
  port_number: number
  device_id: string | null
  is_active: boolean
}

export interface AutomaticBalunPort {
  balun_id: string
  port_number: number
  camera_id: string | null
  is_active: boolean
}

const isActive = (status: string) => status === 'ativo' || status === 'online'

export function buildAutomaticTopologyConnections({
  nodes,
  cameras,
  switchPorts,
  balunPorts,
}: {
  nodes: AutomaticTopologyNode[]
  cameras: AutomaticCameraConnection[]
  switchPorts: AutomaticSwitchPort[]
  balunPorts: AutomaticBalunPort[]
}) {
  const connections: AutomaticTopologyConnection[] = []
  const keys = new Set<string>()
  const connectedTargets = new Set<string>()
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const routers = nodes.filter((node) => node.type === 'router')
  const switches = nodes.filter((node) => node.type === 'switch')
  const dvrs = nodes.filter((node) => node.type === 'dvr')

  const add = (
    source: string,
    target: string,
    label?: string,
    idSuffix = `${source}-${target}`,
    medium: AutomaticTopologyConnection['medium'] = 'lan',
  ) => {
    if (source === target || !nodeById.has(source) || !nodeById.has(target)) return
    const key = `${source}:${target}`
    if (keys.has(key)) return
    keys.add(key)
    connectedTargets.add(target)
    const targetNode = nodeById.get(target)!
    connections.push({ id: `auto-${idSuffix}`, source, target, active: isActive(targetNode.status), label, style: 'dashed', medium })
  }

  routers.forEach((router) => add('internet', router.id, 'WAN', `internet-${router.id}`, 'wan'))

  switchPorts
    .filter((port) => port.is_active && port.device_id && nodeById.has(port.switch_id) && nodeById.has(port.device_id))
    .forEach((port) => {
      const device = nodeById.get(port.device_id!)!
      if (device.type === 'camera') return // Câmeras usam seus campos switch_id/switch_port.
      if (device.type === 'router') add(device.id, port.switch_id, `P${port.port_number}`, `switch-port-${port.switch_id}-${port.port_number}`, 'lan')
      else add(port.switch_id, device.id, `P${port.port_number}`, `switch-port-${port.switch_id}-${port.port_number}`, 'lan')
    })

  switches.forEach((networkSwitch) => {
    if (!connectedTargets.has(networkSwitch.id)) {
      if (routers.length === 1) add(routers[0].id, networkSwitch.id, 'LAN', `router-switch-${networkSwitch.id}`, 'lan')
      else if (routers.length === 0) add('internet', networkSwitch.id, 'Rede', `internet-switch-${networkSwitch.id}`, 'wan')
    }
  })

  dvrs.forEach((dvr) => {
    if (!connectedTargets.has(dvr.id) && switches.length === 1) add(switches[0].id, dvr.id, 'LAN', `switch-dvr-${dvr.id}`, 'lan')
  })

  const balunPortByCamera = new Map(
    balunPorts.filter((port) => port.is_active && port.camera_id).map((port) => [port.camera_id!, port]),
  )

  cameras.forEach((camera) => {
    const cameraActive = isActive(camera.status)
    const switchNode = camera.switch_id ? nodeById.get(camera.switch_id) : undefined
    const balunPort = balunPortByCamera.get(camera.id)
    const balunId = camera.balun_id || balunPort?.balun_id
    const isIp = camera.connection_type === 'ip' || camera.connection_type === 'wifi'

    if (isIp && switchNode?.type === 'switch') {
      add(camera.switch_id!, camera.id, camera.switch_port ? `P${camera.switch_port}` : 'IP/PoE', `switch-camera-${camera.id}`, 'poe')
      return
    }

    if (balunId && nodeById.get(balunId)?.type === 'balun') {
      if (camera.dvr_id && nodeById.get(camera.dvr_id)?.type === 'dvr') {
        add(camera.dvr_id, balunId, 'Vídeo', `dvr-balun-${camera.dvr_id}-${balunId}`, 'video')
      }
      add(balunId, camera.id, camera.balun_port || balunPort?.port_number ? `P${camera.balun_port || balunPort?.port_number}` : 'UTP', `balun-camera-${camera.id}`, 'utp-video')
      const created = connections.at(-1)
      if (created?.target === camera.id) created.active = cameraActive
      return
    }

    if (camera.dvr_id && nodeById.get(camera.dvr_id)?.type === 'dvr') {
      add(camera.dvr_id, camera.id, camera.channel_number ? `CH${camera.channel_number}` : 'Coaxial', `dvr-camera-${camera.id}`, 'coaxial')
      const created = connections.at(-1)
      if (created?.target === camera.id) created.active = cameraActive
    }
  })

  return connections
}
