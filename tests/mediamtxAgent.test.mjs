import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertValidMediaMtxConfig,
  buildBackupPath,
  writeMediaMtxConfigWithBackup,
} from '../tools/mediamtx-agent/agentCore.mjs'

test('assertValidMediaMtxConfig accepts a MediaMTX paths block', () => {
  assert.doesNotThrow(() => assertValidMediaMtxConfig([
    'paths:',
    '  im5c:',
    '    source: rtsp://admin:senha@192.168.0.211:554/live',
    '    rtspTransport: tcp',
  ].join('\n')))
})

test('assertValidMediaMtxConfig rejects empty or non-path YAML payloads', () => {
  assert.throws(() => assertValidMediaMtxConfig(''), /YAML vazio/)
  assert.throws(() => assertValidMediaMtxConfig('foo: bar'), /precisa começar com "paths:"/)
})

test('buildBackupPath adds a timestamped backup suffix beside the target file', () => {
  const result = buildBackupPath('C:\\MediaMTX\\mediamtx.yml', new Date('2026-06-29T17:39:20Z'))

  assert.match(result, /mediamtx\.yml\.bak-20260629-173920$/)
})

test('writeMediaMtxConfigWithBackup creates a backup and replaces the target file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cftv-mediamtx-agent-'))
  try {
    const target = path.join(dir, 'mediamtx.yml')
    await writeFile(target, 'paths:\n  old:\n    source: rtsp://old\n', 'utf8')

    const result = await writeMediaMtxConfigWithBackup({
      configPath: target,
      yaml: 'paths:\n  im5c:\n    source: rtsp://new\n    rtspTransport: tcp\n',
      now: new Date('2026-06-29T17:39:20Z'),
    })

    assert.equal(await readFile(target, 'utf8'), 'paths:\n  im5c:\n    source: rtsp://new\n    rtspTransport: tcp\n')
    assert.equal(await readFile(result.backupPath, 'utf8'), 'paths:\n  old:\n    source: rtsp://old\n')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
