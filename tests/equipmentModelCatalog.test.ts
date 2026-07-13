import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCameraModelNotes,
  buildSwitchModelNotes,
  findEquipmentModelByText,
  parseCameraModelDetails,
  parseSwitchModelDetails,
} from '../src/lib/equipmentModelCatalog.ts'

const models = [
  { id: '1', brand: 'Intelbras', model: 'VIP 1230', type: 'camera' },
  { id: '2', brand: 'Hikvision', model: 'DS-7608', type: 'dvr' },
]

test('finds a saved model by typed model text and prefers matching brand', () => {
  const duplicateModels = [
    ...models,
    { id: '3', brand: 'Intelbras', model: 'DS-7608', type: 'dvr' },
  ]

  assert.equal(findEquipmentModelByText(duplicateModels, ' ds-7608 ', 'Intelbras')?.id, '3')
  assert.equal(findEquipmentModelByText(duplicateModels, 'VIP 1230')?.id, '1')
})

test('stores and parses reusable camera IP and WiFi model details in notes', () => {
  const notes = buildCameraModelNotes({
    lensType: '2.8mm',
    irDistanceMeters: '30',
    operatingVoltage: '12V',
    currentConsumption: '0.5',
    connectionType: 'wifi',
    technology: 'wifi_smart',
    powerSourceType: 'power_supply',
    powerSupplyVoltage: '12V',
    powerSupplyCurrent: '2',
  })

  assert.equal(notes, 'Lente: 2.8mm | IR: 30m | Tensão: 12V | Corrente: 0,5A | Conexão: wifi | Tecnologia: wifi_smart | Alimentação: power_supply | Fonte: 12V 2A')
  assert.deepEqual(parseCameraModelDetails(notes), {
    lensType: '2.8mm',
    irDistanceMeters: '30',
    operatingVoltage: '12V',
    currentConsumption: '0.5',
    connectionType: 'wifi',
    technology: 'wifi_smart',
    powerSourceType: 'power_supply',
    powerSupplyVoltage: '12V',
    powerSupplyCurrent: '2',
  })
})

test('stores and parses reusable switch PoE budget in notes', () => {
  assert.equal(buildSwitchModelNotes('150'), 'Budget PoE: 150W')
  assert.deepEqual(parseSwitchModelDetails('Budget PoE: 150W'), { poeBudgetWatts: '150' })
})
