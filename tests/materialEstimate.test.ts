import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateConnectionLength, summarizeCapacity } from '../src/lib/materialEstimate.ts'

test('estimates cable length from plan dimensions and percentage positions', () => {
  const length = estimateConnectionLength(
    { x: 10, y: 20 },
    { x: 60, y: 70 },
    { widthMeters: 40, heightMeters: 20 },
  )
  assert.equal(length, 22.4)
})

test('summarizes used switch ports and available recorder channels', () => {
  const result = summarizeCapacity(
    [
      { id: 'cam-1', switch_id: 'sw-1', switch_port: 1, dvr_id: null, channel_number: null },
      { id: 'cam-2', switch_id: 'sw-1', switch_port: 2, dvr_id: 'dvr-1', channel_number: 1 },
      { id: 'cam-3', switch_id: null, switch_port: null, dvr_id: 'dvr-1', channel_number: 3 },
    ],
    [{ id: 'sw-1', totalPorts: 8 }],
    [{ id: 'dvr-1', totalChannels: 4 }],
  )

  assert.deepEqual(result, {
    usedSwitchPorts: 2,
    totalSwitchPorts: 8,
    usedRecorderChannels: 2,
    totalRecorderChannels: 4,
  })
})
