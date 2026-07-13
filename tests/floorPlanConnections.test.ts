import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createManualConnection,
  validateManualConnection,
  type ManualConnection,
} from '../src/lib/floorPlanConnections.ts'

const existing: ManualConnection[] = [{
  id: 'link-1',
  sourceId: 'router-1',
  targetId: 'switch-1',
  cableType: 'utp_cat6',
  label: 'Porta LAN 1',
  lineStyle: 'dashed',
  color: '#0ea5e9',
}]

test('rejects a connection to the same equipment', () => {
  assert.equal(validateManualConnection(existing, 'router-1', 'router-1'), 'Selecione dois equipamentos diferentes.')
})

test('rejects an existing connection regardless of direction', () => {
  assert.equal(validateManualConnection(existing, 'switch-1', 'router-1'), 'Esta conexão já existe no mapa.')
})

test('creates a valid connection with explicit visual settings', () => {
  const connection = createManualConnection({
    id: 'link-2',
    sourceId: 'switch-1',
    targetId: 'dvr-1',
    cableType: 'utp_cat5',
    label: 'Porta 2',
    lineStyle: 'solid',
    color: '#22c55e',
  })

  assert.deepEqual(connection, {
    id: 'link-2',
    sourceId: 'switch-1',
    targetId: 'dvr-1',
    cableType: 'utp_cat5',
    label: 'Porta 2',
    lineStyle: 'solid',
    color: '#22c55e',
  })
})
