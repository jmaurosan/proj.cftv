import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeProjectAssets, parseProjectAssets, validateNobreak } from '../src/lib/projectAssets.ts'

test('reads empty or legacy client notes without losing compatibility', () => {
  assert.deepEqual(parseProjectAssets(null), { nobreaks: [], documents: [], media: [] })
  assert.deepEqual(parseProjectAssets('Anotação antiga'), { nobreaks: [], documents: [], media: [] })
})

test('normalizes legacy nobreak power fields and missing media collection', () => {
  const assets = parseProjectAssets(JSON.stringify({
    projectAssets: {
      nobreaks: [{
        id: 'ups-legacy', name: 'Nobreak antigo', ratedPowerVa: 1800,
        outputPowerWatts: 900, inputVoltage: 127, outputVoltage: 120,
      }],
      documents: [],
    },
  }))

  assert.equal(assets.nobreaks[0].ratedPowerWatts, 900)
  assert.equal(assets.nobreaks[0].inputVoltage, '127')
  assert.equal(assets.nobreaks[0].topology, 'interactive')
  assert.deepEqual(assets.media, [])
})

test('merges assets while preserving floor plan, topology and text notes', () => {
  const notes = JSON.stringify({
    textNotes: 'Rack principal',
    floorPlan: { background: 'grid', positions: {} },
    topologyPositions: { router: { x: 50, y: 10 } },
  })
  const merged = JSON.parse(mergeProjectAssets(notes, {
    nobreaks: [{ id: 'ups-1', name: 'Nobreak Rack' } as never],
    documents: [{ id: 'doc-1', title: 'Manual' } as never],
    media: [{ id: 'media-1', title: 'Foto do rack' } as never],
  }))

  assert.equal(merged.textNotes, 'Rack principal')
  assert.equal(merged.floorPlan.background, 'grid')
  assert.equal(merged.topologyPositions.router.x, 50)
  assert.equal(merged.projectAssets.nobreaks[0].id, 'ups-1')
  assert.equal(merged.projectAssets.documents[0].id, 'doc-1')
  assert.equal(merged.projectAssets.media[0].id, 'media-1')
})

test('validates required electrical and battery data', () => {
  const valid = {
    name: 'Nobreak principal', brand: 'Intelbras', model: 'XNB', location: 'Rack',
    ratedPowerVa: 1800, ratedPowerWatts: 900, topology: 'interactive',
    inputVoltage: '120 / 220', inputVoltageMode: 'automatic_bivolt', outputVoltage: 120,
    outletQuantity: 6, batteryQuantity: 2,
    batteryVoltage: 12, batteryCapacityAh: 7, hasProtection: true, protections: ['overload'],
  }
  assert.equal(validateNobreak(valid), null)
  assert.match(validateNobreak({ ...valid, ratedPowerWatts: 1900 }) || '', /potência ativa/)
  assert.match(validateNobreak({ ...valid, outletQuantity: 0 }) || '', /tomada/)
  assert.match(validateNobreak({ ...valid, batteryQuantity: 0 }) || '', /bateria/)
  assert.match(validateNobreak({ ...valid, protections: [] }) || '', /proteção/)
})
