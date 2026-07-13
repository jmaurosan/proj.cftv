import assert from 'node:assert/strict'
import test from 'node:test'
import { getNextEquipmentPosition } from '../src/lib/floorPlanLayout.ts'

test('stagger newly added equipment across the floor plan grid', () => {
  assert.deepEqual(getNextEquipmentPosition(0), { x: 12, y: 14 })
  assert.deepEqual(getNextEquipmentPosition(1), { x: 24.5, y: 14 })
  assert.deepEqual(getNextEquipmentPosition(7), { x: 12, y: 28 })
})
