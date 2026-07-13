import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAutomaticTopologyConnections } from '../src/lib/automaticTopology.ts'

const nodes = [
  { id: 'internet', type: 'internet', status: 'online' },
  { id: 'r1', type: 'router', status: 'ativo' },
  { id: 's1', type: 'switch', status: 'ativo' },
  { id: 'd1', type: 'dvr', status: 'ativo' },
  { id: 'b1', type: 'balun', status: 'ativo' },
  { id: 'ip1', type: 'camera', status: 'ativo' },
  { id: 'a1', type: 'camera', status: 'ativo' },
  { id: 'loose', type: 'camera', status: 'ativo' },
] as const

test('monta a cadeia física sem conectar câmeras sem vínculo por fallback', () => {
  const result = buildAutomaticTopologyConnections({
    nodes: [...nodes],
    switchPorts: [],
    balunPorts: [{ balun_id: 'b1', port_number: 2, camera_id: 'a1', is_active: true }],
    cameras: [
      { id: 'ip1', status: 'ativo', connection_type: 'ip', switch_id: 's1', switch_port: 4 },
      { id: 'a1', status: 'ativo', connection_type: 'analogica', dvr_id: 'd1', balun_id: 'b1', balun_port: 2, channel_number: 1 },
      { id: 'loose', status: 'ativo', connection_type: 'ip' },
    ],
  })
  const pairs = result.map((item) => `${item.source}>${item.target}`)
  assert.deepEqual(pairs, ['internet>r1', 'r1>s1', 's1>d1', 's1>ip1', 'd1>b1', 'b1>a1'])
  assert.equal(result.some((item) => item.target === 'loose'), false)
})
