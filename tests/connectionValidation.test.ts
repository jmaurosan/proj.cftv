import assert from 'node:assert/strict'
import test from 'node:test'

import {
  validateCameraConflicts,
  validateDvrConflicts,
  validatePortAssignment,
} from '../src/lib/connectionValidation.ts'

const cameras = [
  {
    id: 'cam-1', name: 'Entrada', ip_address: '192.168.0.20',
    dvr_id: 'dvr-1', channel_number: 1, balun_id: 'balun-1', balun_port: 1,
    switch_id: null, switch_port: null,
  },
  {
    id: 'cam-2', name: 'Garagem', ip_address: null,
    dvr_id: 'dvr-1', channel_number: 2, balun_id: null, balun_port: null,
    switch_id: 'switch-1', switch_port: 3,
  },
]

test('identifies camera name, IP, DVR channel, balun port and switch port conflicts', () => {
  assert.match(validateCameraConflicts(cameras, { name: ' entrada ' }) || '', /Entrada/)
  assert.match(validateCameraConflicts(cameras, { name: 'Nova', ip_address: '192.168.0.20' }) || '', /IP/)
  assert.match(validateCameraConflicts(cameras, { name: 'Nova', dvr_id: 'dvr-1', channel_number: 2 }) || '', /canal 2/)
  assert.match(validateCameraConflicts(cameras, { name: 'Nova', balun_id: 'balun-1', balun_port: 1 }) || '', /Power Balun/)
  assert.match(validateCameraConflicts(cameras, { name: 'Nova', switch_id: 'switch-1', switch_port: 3 }) || '', /switch/)
})

test('shows where the existing camera is registered when the name already exists', () => {
  const message = validateCameraConflicts(
    [{
      id: 'cam-3', name: 'Elevador Social Direito', ip_address: null,
      dvr_id: 'dvr-1', dvr_name: 'DVR1', channel_number: 6, balun_id: null, balun_port: null,
      switch_id: null, switch_port: null,
    }],
    { name: ' elevador social direito ' },
  )

  assert.equal(
    message,
    'A câmera "Elevador Social Direito" já está cadastrada em DVR1 CH 6. Deseja substituir?',
  )
})

test('allows an existing camera to keep its own connections during editing', () => {
  assert.equal(validateCameraConflicts(cameras, cameras[0], 'cam-1'), null)
})

test('identifies duplicate DVR name and IP while allowing the edited record', () => {
  const dvrs = [{ id: 'dvr-1', name: 'DVR Principal', ip_address: '192.168.0.10' }]
  assert.match(validateDvrConflicts(dvrs, { name: 'dvr principal', ip_address: '192.168.0.11' }) || '', /DVR Principal/)
  assert.match(validateDvrConflicts(dvrs, { name: 'Outro', ip_address: '192.168.0.10' }) || '', /IP/)
  assert.equal(validateDvrConflicts(dvrs, dvrs[0], 'dvr-1'), null)
})

test('blocks overwriting an occupied port and assigning one device twice', () => {
  const ports = [
    { port_number: 1, target_id: 'cam-1', target_name: 'Entrada' },
    { port_number: 2, target_id: null, target_name: null },
  ]
  assert.match(validatePortAssignment(ports, { port_number: 1, target_id: 'cam-2' }, 'Power Balun') || '', /Entrada/)
  assert.match(validatePortAssignment(ports, { port_number: 2, target_id: 'cam-1' }, 'Power Balun') || '', /porta 1/)
  assert.equal(validatePortAssignment(ports, { port_number: 1, target_id: 'cam-1' }, 'Power Balun'), null)
})
