import test from 'node:test'
import assert from 'node:assert/strict'
import { findBestSegment, findDuplicateIps, getSegmentBounds, ipv4ToNumber, numberToIpv4, segmentContainsIp, suggestNextIp, validateSegment } from '../src/lib/ipPlanning.ts'

const segment = { id: 'seg-1', network_ip: '192.168.0.0', subnet_mask: '255.255.255.0', gateway_ip: '192.168.0.1', dhcp_start_ip: '192.168.0.100', dhcp_end_ip: '192.168.0.200' }

test('converte IPv4 e calcula os limites da sub-rede', () => {
  assert.equal(numberToIpv4(ipv4ToNumber('192.168.0.10')!), '192.168.0.10')
  assert.deepEqual(getSegmentBounds(segment), { network: ipv4ToNumber('192.168.0.0'), broadcast: ipv4ToNumber('192.168.0.255'), firstHost: ipv4ToNumber('192.168.0.1'), lastHost: ipv4ToNumber('192.168.0.254'), prefix: 24 })
})

test('detecta IPs duplicados mesmo com CIDR', () => {
  const duplicates = findDuplicateIps([{ id: '1', name: 'DVR', type: 'DVR', ip: '192.168.0.10' }, { id: '2', name: 'Roteador', type: 'Roteador', ip: '192.168.0.10/24' }])
  assert.equal(duplicates.get('192.168.0.10')?.length, 2)
})

test('associa a sub-rede mais específica e sugere IP fora do DHCP', () => {
  const narrow = { ...segment, id: 'seg-2', network_ip: '192.168.0.0', subnet_mask: '255.255.255.128' }
  assert.equal(findBestSegment([segment, narrow], '192.168.0.50')?.id, 'seg-2')
  assert.equal(suggestNextIp(segment, ['192.168.0.2']), '192.168.0.3')
})

test('valida gateway e DHCP dentro da sub-rede', () => {
  assert.equal(segmentContainsIp(segment, '192.168.0.240'), true)
  assert.deepEqual(validateSegment({ ...segment, gateway_ip: '10.0.0.1' }), ['Gateway precisa pertencer à sub-rede.'])
})
