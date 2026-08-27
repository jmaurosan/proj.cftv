import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePowerWatts, parseSingleVoltage, summarizePowerCategory } from '../src/lib/powerConsumption.ts'

test('calcula watts automaticamente a partir de tensao e corrente', () => {
  assert.equal(calculatePowerWatts({ operating_voltage: '12V DC', current_consumption_a: 0.45 }), 5.4)
  assert.equal(calculatePowerWatts({ operating_voltage: '24,0 V', current_consumption_a: 1.5 }), 36)
})

test('potencia informada em watts tem prioridade e bivolt ambiguo nao e calculado', () => {
  assert.equal(calculatePowerWatts({ power_watts: 18, operating_voltage: '12V', current_consumption_a: 2 }), 18)
  assert.equal(parseSingleVoltage('Bivolt 110/220V'), null)
  assert.equal(calculatePowerWatts({ operating_voltage: 'Bivolt 110/220V', current_consumption_a: 0.5 }), null)
})

test('resume consumo conhecido sem estimar equipamentos incompletos', () => {
  assert.deepEqual(summarizePowerCategory([
    { power_watts: 10 },
    { operating_voltage: '12V', current_consumption_a: 0.5 },
    { operating_voltage: '12V' },
  ]), { watts: 16, calculatedCount: 2, missingCount: 1, totalCount: 3 })
})
