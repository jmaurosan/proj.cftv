export type ManualConnectionLineStyle = 'solid' | 'dashed'

export interface ManualConnection {
  id: string
  sourceId: string
  targetId: string
  cableType: string
  label: string
  lineStyle: ManualConnectionLineStyle
  color: string
}

export type ManualConnectionInput = ManualConnection

const hasSameEndpoints = (
  connection: Pick<ManualConnection, 'sourceId' | 'targetId'>,
  sourceId: string,
  targetId: string,
) => (
  (connection.sourceId === sourceId && connection.targetId === targetId) ||
  (connection.sourceId === targetId && connection.targetId === sourceId)
)

export function validateManualConnection(
  connections: ManualConnection[],
  sourceId: string,
  targetId: string,
) {
  if (sourceId === targetId) return 'Selecione dois equipamentos diferentes.'
  if (connections.some((connection) => hasSameEndpoints(connection, sourceId, targetId))) {
    return 'Esta conexão já existe no mapa.'
  }
  return null
}

export function createManualConnection(input: ManualConnectionInput): ManualConnection {
  return { ...input }
}
