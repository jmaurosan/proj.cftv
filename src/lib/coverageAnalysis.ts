export interface CoveragePoint {
  x: number
  y: number
}

export interface CameraCoverageView extends CoveragePoint {
  angle: number
  range: number
  direction: number
}

export interface CoverageCell extends CoveragePoint {
  width: number
  height: number
}

export interface CoverageAnalysis {
  totalCells: number
  coveredCells: number
  coveragePercentage: number
  blindCells: CoverageCell[]
}

const normalizeAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180

export const isPointInsideCameraView = (point: CoveragePoint, camera: CameraCoverageView) => {
  const dx = point.x - camera.x
  const dy = point.y - camera.y
  const distance = Math.hypot(dx, dy)
  if (distance > camera.range) return false

  const pointDirection = Math.atan2(dy, dx) * 180 / Math.PI
  const difference = Math.abs(normalizeAngle(pointDirection - camera.direction))
  return difference <= Math.min(360, camera.angle) / 2
}

export const analyzeCoverage = (
  cameras: CameraCoverageView[],
  options: { columns?: number; rows?: number } = {}
): CoverageAnalysis => {
  const columns = Math.max(1, Math.round(options.columns ?? 20))
  const rows = Math.max(1, Math.round(options.rows ?? 11))
  const width = 100 / columns
  const height = 100 / rows
  const blindCells: CoverageCell[] = []
  let coveredCells = 0

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = { x: column * width, y: row * height, width, height }
      const center = { x: cell.x + width / 2, y: cell.y + height / 2 }
      if (cameras.some((camera) => isPointInsideCameraView(center, camera))) {
        coveredCells += 1
      } else {
        blindCells.push(cell)
      }
    }
  }

  const totalCells = columns * rows
  return {
    totalCells,
    coveredCells,
    coveragePercentage: Math.round((coveredCells / totalCells) * 100),
    blindCells
  }
}
