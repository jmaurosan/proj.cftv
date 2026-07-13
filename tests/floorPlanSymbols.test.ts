import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createTechnicalSymbol,
  duplicateTechnicalSymbols,
  TECHNICAL_SYMBOL_CATALOG,
} from '../src/lib/floorPlanSymbols.ts'

test('catalog includes the complete CCTV technical symbol set', () => {
  const kinds = TECHNICAL_SYMBOL_CATALOG.map((item) => item.kind)
  assert.ok(kinds.includes('camera_dome'))
  assert.ok(kinds.includes('nvr'))
  assert.ok(kinds.includes('power_supply'))
  assert.ok(kinds.includes('ups'))
})

test('creates a technical symbol with its catalog label', () => {
  assert.deepEqual(createTechnicalSymbol('nvr', { x: 20, y: 30 }, 'symbol-1'), {
    id: 'symbol-1',
    kind: 'nvr',
    label: 'NVR',
    x: 20,
    y: 30,
  })
})

test('duplicates selected symbols with an offset and new ids', () => {
  const original = createTechnicalSymbol('ups', { x: 40, y: 50 }, 'symbol-1')
  const duplicated = duplicateTechnicalSymbols([original], ['symbol-1'], () => 'symbol-2')

  assert.deepEqual(duplicated, [{
    id: 'symbol-2',
    kind: 'ups',
    label: 'Nobreak',
    x: 42.5,
    y: 52.5,
  }])
})
