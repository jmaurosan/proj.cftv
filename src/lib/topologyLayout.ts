export type TopologyLayoutNodeType =
  | 'internet'
  | 'router'
  | 'switch'
  | 'rack'
  | 'dvr'
  | 'balun'
  | 'monitor'
  | 'camera'
  | 'camera-group'

export interface TopologyLayoutNode {
  id: string
  name: string
  type: TopologyLayoutNodeType
}

export interface TopologyLayoutConnection {
  source: string
  target: string
  label?: string
}

export interface TopologyPosition {
  x: number
  y: number
}

export interface TopologyLane {
  id: string
  label: string
  y: number
  height: number
}

export interface AutomaticTopologyLayout {
  positions: Record<string, TopologyPosition>
  width: number
  height: number
  lanes: TopologyLane[]
  orphanIds: string[]
}

const NODE_WIDTH = 168
const GROUP_GAP = 46
const NODE_GAP = 28
const SIDE_PADDING = 110
const TOP_PADDING = 86
const ROW_GAP = 132

const laneOrder: Record<TopologyLayoutNodeType, number> = {
  internet: 0,
  router: 1,
  rack: 2,
  switch: 2,
  dvr: 3,
  balun: 4,
  monitor: 4,
  camera: 5,
  'camera-group': 5,
}

const laneLabels = [
  'Internet e operadora',
  'Roteamento',
  'Distribuição',
  'Gravação',
  'Transporte e visualização',
  'Pontos de câmera',
]

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' })

export function classifyTopologyLane(node: TopologyLayoutNode) {
  return laneOrder[node.type]
}

export function computeAutomaticTopologyLayout(
  nodes: TopologyLayoutNode[],
  connections: TopologyLayoutConnection[],
): AutomaticTopologyLayout {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const parentsByChild = new Map<string, string[]>()
  const childrenByParent = new Map<string, string[]>()

  connections.forEach((connection) => {
    if (!nodeById.has(connection.source) || !nodeById.has(connection.target) || connection.source === connection.target) return
    parentsByChild.set(connection.target, [...(parentsByChild.get(connection.target) ?? []), connection.source])
    childrenByParent.set(connection.source, [...(childrenByParent.get(connection.source) ?? []), connection.target])
  })

  const orphanIds = nodes
    .filter((node) => node.type !== 'internet' && !(parentsByChild.get(node.id)?.length))
    .map((node) => node.id)

  const groups = new Map<string, TopologyLayoutNode[]>()
  nodes.forEach((node) => {
    const parentId = parentsByChild.get(node.id)?.[0]
    const rootKey = parentId ?? `orphan-${classifyTopologyLane(node)}`
    groups.set(rootKey, [...(groups.get(rootKey) ?? []), node])
  })

  const rows = new Map<number, TopologyLayoutNode[]>()
  nodes.forEach((node) => {
    const lane = classifyTopologyLane(node)
    rows.set(lane, [...(rows.get(lane) ?? []), node])
  })

  const rowWidths = [...rows.values()].map((row) => {
    const parentKeys = new Set(row.map((node) => parentsByChild.get(node.id)?.[0] ?? `orphan-${classifyTopologyLane(node)}`))
    return row.length * NODE_WIDTH + Math.max(0, row.length - 1) * NODE_GAP + Math.max(0, parentKeys.size - 1) * GROUP_GAP
  })
  const width = Math.max(1500, Math.max(0, ...rowWidths) + SIDE_PADDING * 2)
  const positions: Record<string, TopologyPosition> = {}

  rows.forEach((row, lane) => {
    const orderedGroups = [...new Set(row.map((node) => parentsByChild.get(node.id)?.[0] ?? `orphan-${lane}`))]
      .sort((a, b) => {
        const aParent = nodeById.get(a)
        const bParent = nodeById.get(b)
        const ax = aParent ? positions[aParent.id]?.x : undefined
        const bx = bParent ? positions[bParent.id]?.x : undefined
        if (ax !== undefined && bx !== undefined) return ax - bx
        return naturalCompare(aParent?.name ?? a, bParent?.name ?? b)
      })

    const ordered = orderedGroups.flatMap((groupKey) =>
      (groups.get(groupKey) ?? [])
        .filter((node) => classifyTopologyLane(node) === lane)
        .sort((a, b) => naturalCompare(a.name, b.name)),
    )

    let cursor = SIDE_PADDING
    let previousGroup = ''
    ordered.forEach((node) => {
      const groupKey = parentsByChild.get(node.id)?.[0] ?? `orphan-${lane}`
      if (previousGroup && previousGroup !== groupKey) cursor += GROUP_GAP
      positions[node.id] = {
        x: cursor + NODE_WIDTH / 2,
        y: TOP_PADDING + lane * ROW_GAP,
      }
      cursor += NODE_WIDTH + NODE_GAP
      previousGroup = groupKey
    })

    const usedWidth = Math.max(0, cursor - NODE_GAP - SIDE_PADDING)
    const offset = Math.max(0, (width - usedWidth) / 2 - SIDE_PADDING)
    ordered.forEach((node) => {
      positions[node.id].x += offset
    })
  })

  // Pais com um único conjunto de filhos ficam centralizados sobre a sua subárvore.
  for (let lane = laneLabels.length - 2; lane >= 0; lane -= 1) {
    ;(rows.get(lane) ?? []).forEach((node) => {
      const childPositions = (childrenByParent.get(node.id) ?? [])
        .map((id) => positions[id])
        .filter(Boolean)
      if (childPositions.length > 0) {
        positions[node.id].x = childPositions.reduce((sum, position) => sum + position.x, 0) / childPositions.length
      }
    })
  }

  const lanes = laneLabels.map((label, index) => ({
    id: `lane-${index}`,
    label,
    y: 24 + index * ROW_GAP,
    height: ROW_GAP - 12,
  }))

  return {
    positions,
    width,
    height: TOP_PADDING + laneLabels.length * ROW_GAP + 70,
    lanes,
    orphanIds,
  }
}

export function buildOrthogonalTopologyPath(
  source: TopologyPosition,
  target: TopologyPosition,
  sourceHeight = 58,
  targetHeight = 58,
) {
  const startY = source.y + sourceHeight / 2
  const endY = target.y - targetHeight / 2
  const middleY = startY + (endY - startY) / 2
  return `M ${source.x} ${startY} V ${middleY} H ${target.x} V ${endY}`
}
