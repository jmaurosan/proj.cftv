import assert from 'node:assert/strict'
import test from 'node:test'

import { getCameraChannelDiagnostics } from '../src/lib/dvrChannels.ts'

const dvr = { id: 'dvr-1', name: 'DVR 1', analog_channels: 16, ip_channels: 2, disabled_analog_channels: [14] }

test('detecta camera IP em canal BNC e aceita canal convertido', () => {
  assert.equal(getCameraChannelDiagnostics({ connection_type: 'ip', dvr_id: 'dvr-1', channel_number: 13 }, dvr)[0]?.code, 'ip_on_bnc')
  assert.deepEqual(getCameraChannelDiagnostics({ connection_type: 'ip', dvr_id: 'dvr-1', channel_number: 14 }, dvr), [])
})

test('detecta camera analogica em canal IP e vinculos incompletos', () => {
  assert.equal(getCameraChannelDiagnostics({ connection_type: 'analogica', dvr_id: 'dvr-1', channel_number: 17 }, dvr)[0]?.code, 'analog_on_ip')
  assert.equal(getCameraChannelDiagnostics({ connection_type: 'analogica', dvr_id: null, channel_number: null })[0]?.code, 'missing_dvr')
  assert.equal(getCameraChannelDiagnostics({ connection_type: 'ip', dvr_id: 'dvr-1', channel_number: null }, dvr)[0]?.code, 'missing_channel')
})
