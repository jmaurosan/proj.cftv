import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFloorPlanReportSummary, parseFloorPlanFromNotes } from '../src/lib/floorPlanReport.ts'

test('reads the saved floor plan and supplies defaults for older projects', () => {
  const floorPlan = parseFloorPlanFromNotes(JSON.stringify({
    textNotes: 'Projeto existente',
    floorPlan: { background: 'grid', positions: { cam1: { x: 20, y: 50, type: 'camera' } } }
  }))

  assert.ok(floorPlan)
  assert.equal(floorPlan.planWidthMeters, 40)
  assert.equal(floorPlan.planHeightMeters, 22)
  assert.deepEqual(floorPlan.manualConnections, [])
  assert.deepEqual(floorPlan.technicalSymbols, [])
})

test('ignores plain text and invalid notes without breaking the report', () => {
  assert.equal(parseFloorPlanFromNotes('Anotação antiga do cliente'), null)
  assert.equal(parseFloorPlanFromNotes('{invalid'), null)
  assert.equal(parseFloorPlanFromNotes(null), null)
})

test('summarizes coverage, capacity and estimated cable length', () => {
  const floorPlan = parseFloorPlanFromNotes(JSON.stringify({
    floorPlan: {
      background: 'grid',
      planWidthMeters: 40,
      planHeightMeters: 20,
      positions: {
        cam1: { x: 10, y: 50, type: 'camera' },
        sw1: { x: 60, y: 50, type: 'switch' },
        dvr1: { x: 80, y: 50, type: 'dvr' }
      },
      cameraViews: { cam1: { angle: 90, range: 50, direction: 0, color: '#22d3ee' } },
      manualConnections: [{ id: 'link1', sourceId: 'sw1', targetId: 'dvr1', cableType: 'utp_cat6', lineStyle: 'dashed', color: '#0ea5e9' }],
      technicalSymbols: [{ id: 'symbol1', kind: 'ups', label: 'Nobreak', x: 50, y: 80 }]
    }
  }))

  assert.ok(floorPlan)
  const summary = buildFloorPlanReportSummary(
    floorPlan,
    [{ id: 'cam1', switch_id: 'sw1', switch_port: 1, dvr_id: 'dvr1', channel_number: 2 }],
    [{ id: 'sw1', total_ports: 8 }],
    [{ id: 'dvr1', total_channels: 4 }]
  )

  assert.equal(summary.positionedEquipment, 3)
  assert.equal(summary.technicalSymbols, 1)
  assert.equal(summary.manualConnections, 1)
  assert.equal(summary.estimatedCableMeters, 20)
  assert.equal(summary.usedSwitchPorts, 1)
  assert.equal(summary.availableRecorderChannels, 3)
  assert.ok(summary.coveragePercentage > 0)
})
