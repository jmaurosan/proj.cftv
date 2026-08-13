import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CABLE_PRESETS,
  applyCablePreset,
  countVideoCameras,
  detectCablePreset,
  validateCablePairs,
} from '../src/lib/cableConfiguration.ts'

test('applyCablePreset devolve as 4 funções na ordem do preset', () => {
  assert.deepEqual(applyCablePreset('video_1cam_power_1'), [
    'video', 'alimentacao', 'nao_utilizado', 'nao_utilizado',
  ])
  assert.deepEqual(applyCablePreset('video_3cam_power_1'), [
    'video', 'video', 'video', 'alimentacao',
  ])
  assert.deepEqual(applyCablePreset('video_4cam'), [
    'video', 'video', 'video', 'video',
  ])
  assert.deepEqual(applyCablePreset('network_data'), [
    'dados', 'dados', 'dados', 'dados',
  ])
})

test('detectCablePreset identifica os presets independente da ordem dos pares', () => {
  assert.equal(detectCablePreset(['video', 'alimentacao', 'nao_utilizado', 'nao_utilizado']), 'video_1cam_power_1')
  assert.equal(detectCablePreset(['nao_utilizado', 'video', 'nao_utilizado', 'alimentacao']), 'video_1cam_power_1')
  assert.equal(detectCablePreset(['video', 'video', 'alimentacao', 'alimentacao']), 'video_2cam_power_2')
  assert.equal(detectCablePreset(['video', 'video', 'video', 'alimentacao']), 'video_3cam_power_1')
  assert.equal(detectCablePreset(['video', 'video', 'video', 'video']), 'video_4cam')
  assert.equal(detectCablePreset(['video', 'nao_utilizado', 'nao_utilizado', 'nao_utilizado']), 'video_1cam_ext')
  assert.equal(detectCablePreset(['video', 'video', 'nao_utilizado', 'nao_utilizado']), 'video_2cam_ext')
  assert.equal(detectCablePreset(['video', 'video', 'video', 'nao_utilizado']), 'video_3cam_ext')
  assert.equal(detectCablePreset(['dados', 'dados', 'dados', 'dados']), 'network_data')
})

test('detectCablePreset devolve personalizado quando nenhuma combinação bate', () => {
  assert.equal(detectCablePreset(['video', 'dados', 'alimentacao', 'nao_utilizado']), 'personalizado')
  assert.equal(detectCablePreset(['video', 'video', 'dados', 'dados']), 'personalizado')
})

test('detectCablePreset trata quantidades diferentes de 4 pares como personalizado', () => {
  assert.equal(detectCablePreset(['video']), 'personalizado')
  assert.equal(detectCablePreset(['video', 'video', 'video', 'video', 'video']), 'personalizado')
})

test('countVideoCameras conta os pares de vídeo', () => {
  assert.equal(countVideoCameras(['video', 'video', 'video', 'alimentacao']), 3)
  assert.equal(countVideoCameras(['dados', 'dados', 'dados', 'dados']), 0)
  assert.equal(countVideoCameras(['video', 'alimentacao', 'nao_utilizado', 'nao_utilizado']), 1)
})

test('CABLE_PRESETS: soma vídeo + alim + não usados sempre = 4 (exceto network_data)', () => {
  for (const preset of Object.values(CABLE_PRESETS)) {
    if (preset.id === 'network_data' || preset.id === 'personalizado') continue
    const total = preset.videoCameras + preset.powerPairs + preset.unusedPairs
    assert.equal(total, 4, `Preset ${preset.id} soma ${total}, esperado 4`)
  }
})

test('validateCablePairs aceita configuração correta', () => {
  const result = validateCablePairs([
    { pair_number: 1, function: 'video', camera_id: 'cam-a' },
    { pair_number: 2, function: 'video', camera_id: 'cam-b' },
    { pair_number: 3, function: 'video', camera_id: 'cam-c' },
    { pair_number: 4, function: 'alimentacao', camera_id: null },
  ])
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test('validateCablePairs rejeita 2 câmeras no mesmo cabo (câmera duplicada em pares diferentes)', () => {
  const result = validateCablePairs([
    { pair_number: 1, function: 'video', camera_id: 'cam-a' },
    { pair_number: 2, function: 'video', camera_id: 'cam-a' },
    { pair_number: 3, function: 'nao_utilizado', camera_id: null },
    { pair_number: 4, function: 'nao_utilizado', camera_id: null },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('mesma câmera')))
})

test('validateCablePairs exige camera_id em pares de vídeo', () => {
  const result = validateCablePairs([
    { pair_number: 1, function: 'video', camera_id: null },
    { pair_number: 2, function: 'nao_utilizado', camera_id: null },
    { pair_number: 3, function: 'nao_utilizado', camera_id: null },
    { pair_number: 4, function: 'nao_utilizado', camera_id: null },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('exige câmera vinculada')))
})

test('validateCablePairs rejeita camera_id em pares não-vídeo', () => {
  const result = validateCablePairs([
    { pair_number: 1, function: 'alimentacao', camera_id: 'cam-a' },
    { pair_number: 2, function: 'nao_utilizado', camera_id: null },
    { pair_number: 3, function: 'nao_utilizado', camera_id: null },
    { pair_number: 4, function: 'nao_utilizado', camera_id: null },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('apenas pares de vídeo')))
})

test('validateCablePairs rejeita quantidade errada de pares', () => {
  const result = validateCablePairs([
    { pair_number: 1, function: 'nao_utilizado', camera_id: null },
    { pair_number: 2, function: 'nao_utilizado', camera_id: null },
    { pair_number: 3, function: 'nao_utilizado', camera_id: null },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('exatamente 4 pares')))
})

test('validateCablePairs rejeita numeração inválida de pares', () => {
  const result = validateCablePairs([
    { pair_number: 1, function: 'nao_utilizado', camera_id: null },
    { pair_number: 2, function: 'nao_utilizado', camera_id: null },
    { pair_number: 2, function: 'nao_utilizado', camera_id: null },
    { pair_number: 4, function: 'nao_utilizado', camera_id: null },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('numerados de 1 a 4')))
})
