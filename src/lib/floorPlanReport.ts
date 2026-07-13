import { analyzeCoverage } from './coverageAnalysis.ts'
import { estimateConnectionLength, summarizeCapacity } from './materialEstimate.ts'
import type { ManualConnection } from './floorPlanConnections.ts'
import type { TechnicalSymbol } from './floorPlanSymbols.ts'

export interface ReportPlanPosition {
  x: number
  y: number
  type?: string
}

export interface ReportCameraView {
  angle: number
  range: number
  direction: number
  color?: string
}

export interface FloorPlanReportConfig {
  background: 'grid' | 'image' | 'satellite'
  bgUrl?: string
  positions: Record<string, ReportPlanPosition>
  cameraViews: Record<string, ReportCameraView>
  manualConnections: ManualConnection[]
  technicalSymbols: TechnicalSymbol[]
  planWidthMeters: number
  planHeightMeters: number
}

interface ReportCameraLink {
  id: string
  switch_id: string | null
  switch_port: number | null
  dvr_id: string | null
  channel_number: number | null
}

export interface FloorPlanReportSummary {
  positionedEquipment: number
  technicalSymbols: number
  manualConnections: number
  coveragePercentage: number
  estimatedCableMeters: number
  usedSwitchPorts: number
  totalSwitchPorts: number
  availableSwitchPorts: number
  usedRecorderChannels: number
  totalRecorderChannels: number
  availableRecorderChannels: number
}

export function parseFloorPlanFromNotes(notes: string | null | undefined): FloorPlanReportConfig | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    const floorPlan = parsed?.floorPlan
    if (!floorPlan || typeof floorPlan !== 'object' || !floorPlan.positions || typeof floorPlan.positions !== 'object') {
      return null
    }
    return {
      background: floorPlan.background === 'image' || floorPlan.background === 'satellite' ? floorPlan.background : 'grid',
      bgUrl: typeof floorPlan.bgUrl === 'string' ? floorPlan.bgUrl : undefined,
      positions: floorPlan.positions,
      cameraViews: floorPlan.cameraViews && typeof floorPlan.cameraViews === 'object' ? floorPlan.cameraViews : {},
      manualConnections: Array.isArray(floorPlan.manualConnections) ? floorPlan.manualConnections : [],
      technicalSymbols: Array.isArray(floorPlan.technicalSymbols) ? floorPlan.technicalSymbols : [],
      planWidthMeters: Number(floorPlan.planWidthMeters) > 0 ? Number(floorPlan.planWidthMeters) : 40,
      planHeightMeters: Number(floorPlan.planHeightMeters) > 0 ? Number(floorPlan.planHeightMeters) : 22,
    }
  } catch {
    return null
  }
}

export function buildFloorPlanReportSummary(
  floorPlan: FloorPlanReportConfig,
  cameras: ReportCameraLink[],
  switches: Array<{ id: string; total_ports: number }>,
  recorders: Array<{ id: string; total_channels: number }>,
): FloorPlanReportSummary {
  const positionedCameras = cameras.flatMap((camera) => {
    const position = floorPlan.positions[camera.id]
    if (!position) return []
    const view = floorPlan.cameraViews[camera.id] || { angle: 70, range: 18, direction: 0 }
    return [{ ...position, angle: view.angle, range: view.range, direction: view.direction }]
  })
  const coverage = analyzeCoverage(positionedCameras)
  const capacity = summarizeCapacity(
    cameras,
    switches.map((item) => ({ id: item.id, totalPorts: item.total_ports })),
    recorders.map((item) => ({ id: item.id, totalChannels: item.total_channels })),
  )
  const estimatedCableMeters = cameras.reduce((total, camera) => {
    const source = floorPlan.positions[camera.id]
    const target = floorPlan.positions[camera.switch_id || camera.dvr_id || '']
    if (!source || !target) return total
    return total + estimateConnectionLength(source, target, {
      widthMeters: floorPlan.planWidthMeters,
      heightMeters: floorPlan.planHeightMeters,
    })
  }, 0)

  return {
    positionedEquipment: Object.keys(floorPlan.positions).length,
    technicalSymbols: floorPlan.technicalSymbols.length,
    manualConnections: floorPlan.manualConnections.length,
    coveragePercentage: positionedCameras.length > 0 ? coverage.coveragePercentage : 0,
    estimatedCableMeters: Math.round(estimatedCableMeters * 10) / 10,
    usedSwitchPorts: capacity.usedSwitchPorts,
    totalSwitchPorts: capacity.totalSwitchPorts,
    availableSwitchPorts: Math.max(0, capacity.totalSwitchPorts - capacity.usedSwitchPorts),
    usedRecorderChannels: capacity.usedRecorderChannels,
    totalRecorderChannels: capacity.totalRecorderChannels,
    availableRecorderChannels: Math.max(0, capacity.totalRecorderChannels - capacity.usedRecorderChannels),
  }
}
