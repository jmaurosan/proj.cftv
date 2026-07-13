interface PlanPoint {
  x: number
  y: number
}

interface PlanDimensions {
  widthMeters: number
  heightMeters: number
}

interface CameraCapacityLink {
  id: string
  switch_id: string | null
  switch_port: number | null
  dvr_id: string | null
  channel_number: number | null
}

export function estimateConnectionLength(source: PlanPoint, target: PlanPoint, dimensions: PlanDimensions) {
  const horizontalMeters = Math.abs(target.x - source.x) / 100 * dimensions.widthMeters
  const verticalMeters = Math.abs(target.y - source.y) / 100 * dimensions.heightMeters
  return Math.round(Math.hypot(horizontalMeters, verticalMeters) * 10) / 10
}

export function summarizeCapacity(
  cameras: CameraCapacityLink[],
  switches: Array<{ id: string; totalPorts: number }>,
  recorders: Array<{ id: string; totalChannels: number }>,
) {
  const usedSwitchPorts = new Set(cameras
    .filter((camera) => camera.switch_id && camera.switch_port)
    .map((camera) => `${camera.switch_id}:${camera.switch_port}`)).size
  const usedRecorderChannels = new Set(cameras
    .filter((camera) => camera.dvr_id && camera.channel_number)
    .map((camera) => `${camera.dvr_id}:${camera.channel_number}`)).size

  return {
    usedSwitchPorts,
    totalSwitchPorts: switches.reduce((sum, item) => sum + item.totalPorts, 0),
    usedRecorderChannels,
    totalRecorderChannels: recorders.reduce((sum, item) => sum + item.totalChannels, 0),
  }
}
