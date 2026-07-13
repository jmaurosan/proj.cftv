import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeCoverage, isPointInsideCameraView } from '../src/lib/coverageAnalysis.ts'

test('detects points inside and outside a camera field of view', () => {
  const camera = { x: 50, y: 50, angle: 90, range: 30, direction: 0 }

  assert.equal(isPointInsideCameraView({ x: 70, y: 50 }, camera), true)
  assert.equal(isPointInsideCameraView({ x: 30, y: 50 }, camera), false)
  assert.equal(isPointInsideCameraView({ x: 75, y: 75 }, camera), false)
})

test('returns blind cells and a coverage percentage for the plan', () => {
  const analysis = analyzeCoverage(
    [{ x: 25, y: 50, angle: 90, range: 80, direction: 0 }],
    { columns: 4, rows: 2 }
  )

  assert.equal(analysis.totalCells, 8)
  assert.equal(analysis.coveredCells + analysis.blindCells.length, 8)
  assert.ok(analysis.coveragePercentage > 0)
  assert.ok(analysis.coveragePercentage < 100)
  assert.ok(analysis.blindCells.every((cell) => cell.x >= 0 && cell.x <= 100))
})

test('reports the whole plan as blind when there are no cameras', () => {
  const analysis = analyzeCoverage([], { columns: 5, rows: 3 })

  assert.equal(analysis.coveragePercentage, 0)
  assert.equal(analysis.blindCells.length, 15)
})
