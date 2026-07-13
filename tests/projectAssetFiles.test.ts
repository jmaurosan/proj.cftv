import assert from 'node:assert/strict'
import test from 'node:test'

import { validateEquipmentDocumentFile, validateProjectMediaFile } from '../src/lib/projectAssetFiles.ts'

const file = (name: string, type: string, size: number) => ({ name, type, size })

test('accepts supported document, image and video files', () => {
  assert.equal(validateEquipmentDocumentFile(file('manual.pdf', 'application/pdf', 1024)), null)
  assert.equal(validateProjectMediaFile(file('rack.webp', 'image/webp', 1024)), null)
  assert.equal(validateProjectMediaFile(file('instalacao.mp4', 'video/mp4', 1024)), null)
})

test('rejects unsupported media extensions and mismatched mime types', () => {
  assert.match(validateProjectMediaFile(file('arquivo.exe', 'application/octet-stream', 1024)) || '', /Formato/)
  assert.match(validateProjectMediaFile(file('foto.jpg', 'application/pdf', 1024)) || '', /tipo/)
})

test('enforces separate image and video size limits', () => {
  assert.match(validateProjectMediaFile(file('foto.jpg', 'image/jpeg', 20 * 1024 * 1024 + 1)) || '', /20 MB/)
  assert.match(validateProjectMediaFile(file('video.mp4', 'video/mp4', 100 * 1024 * 1024 + 1)) || '', /100 MB/)
})
