import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS,
  PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS,
  buildDeviceBackupPath,
  isDeviceBackupPathOwnedByUser,
  resolveStorageObjectPath,
} from '../src/lib/storageSecurity.ts'

test('device backup paths are scoped by authenticated user id', () => {
  const path = buildDeviceBackupPath({
    userId: 'user-123',
    equipmentType: 'router',
    equipmentId: 'router-456',
    fileName: 'backup final.cfg',
    timestamp: 1772145600000,
  })

  assert.equal(path, 'user-123/router/router-456/1772145600000_backup_final.cfg')
  assert.equal(isDeviceBackupPathOwnedByUser(path, 'user-123'), true)
  assert.equal(isDeviceBackupPathOwnedByUser(path, 'other-user'), false)
})

test('signed urls for private backups expire quickly', () => {
  assert.equal(DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS, 60 * 10)
})

test('private image object paths resolve from stored paths and legacy public urls', () => {
  assert.equal(resolveStorageObjectPath('user-1/cam-1-123.jpg', 'qr-codes'), 'user-1/cam-1-123.jpg')
  assert.equal(
    resolveStorageObjectPath(
      'https://example.supabase.co/storage/v1/object/public/installation-photos/user-1/cam-1-123.jpg',
      'installation-photos'
    ),
    'user-1/cam-1-123.jpg'
  )
  assert.equal(resolveStorageObjectPath('https://example.com/not-a-storage-url.jpg', 'qr-codes'), null)
})

test('signed urls for private images use a short preview window', () => {
  assert.equal(PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS, 60 * 10)
})
