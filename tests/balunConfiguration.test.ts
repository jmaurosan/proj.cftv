import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyPairFunctionPreset,
  detectPairFunctionPreset,
  getBalunOptionLabel,
  resolvePowerSourceForBalun,
} from '../src/lib/balunConfiguration.ts'

test('applies one pair for video and one pair for power', () => {
  assert.deepEqual(applyPairFunctionPreset('video_power_1'), [
    'video',
    'alimentacao',
    'nao_utilizado',
    'nao_utilizado',
  ])
})

test('applies one pair for video and two pairs for power', () => {
  assert.deepEqual(applyPairFunctionPreset('video_power_2'), [
    'video',
    'alimentacao',
    'alimentacao',
    'nao_utilizado',
  ])
})

test('detects a saved pair arrangement without changing it', () => {
  assert.equal(detectPairFunctionPreset(['video', 'alimentacao', 'nao_utilizado', 'nao_utilizado']), 'video_power_1')
  assert.equal(detectPairFunctionPreset(['video', 'dados', 'alimentacao', 'nao_utilizado']), 'custom')
})

test('power balun supplies the camera while passive balun keeps a separate source', () => {
  assert.equal(resolvePowerSourceForBalun('power', 'power_supply'), 'power_balun')
  assert.equal(resolvePowerSourceForBalun('passive', 'power_balun'), 'power_supply')
  assert.equal(resolvePowerSourceForBalun('passive', 'power_supply'), 'power_supply')
})

test('identifies balun type in camera selector', () => {
  assert.equal(getBalunOptionLabel('VB 1016', 'power'), 'VB 1016 · Power Balun')
  assert.equal(getBalunOptionLabel('XBP 401', 'passive'), 'XBP 401 · Balun passivo')
})
