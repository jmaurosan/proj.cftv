import assert from 'node:assert/strict'
import test from 'node:test'
import type { EquipmentModel } from '../src/lib/types.ts'
import { mergeEquipmentModelSources } from '../src/lib/equipmentModelSources.ts'

const catalogModel: EquipmentModel = {
  id: 'catalog-1',
  type: 'camera',
  brand: 'Intelbras',
  model: 'VIP 1230',
  resolution: '1080p',
  channel_count: null,
  poe_standard: null,
  max_ports: null,
  is_poe: false,
  notes: null,
  user_id: 'user-1',
  created_at: '',
  updated_at: '',
}

test('consolida modelos cadastrados sem duplicar marca e modelo', () => {
  const result = mergeEquipmentModelSources([
    catalogModel,
  ], [
    { id: 'camera:1', brand: ' intelbras ', model: 'vip 1230' },
    { id: 'camera:2', brand: 'Hikvision', model: 'DS-2CD' },
    { id: 'camera:3', brand: 'Sem modelo', model: '   ' },
  ], 'camera')

  assert.equal(result.length, 2)
  assert.equal(result.find((item) => item.model === 'VIP 1230')?.resolution, '1080p')
  assert.equal(result.some((item) => item.model === 'DS-2CD'), true)
})
