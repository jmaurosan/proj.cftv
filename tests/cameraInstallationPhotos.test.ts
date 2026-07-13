import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCameraPhotoGallery, CAMERA_INSTALLATION_PHOTO_LIMIT } from '../src/lib/cameraInstallationPhotos.ts'

test('builds a gallery from legacy and table photos respecting the configured media limit', () => {
  const gallery = buildCameraPhotoGallery({
    legacyPhotoUrl: 'user-1/camera-1-legacy.jpg',
    photos: [
      { id: 'photo-2', storage_path: 'user-1/camera-1-side.jpg', sort_order: 2 },
      { id: 'photo-1', storage_path: 'user-1/camera-1-front.jpg', sort_order: 1 },
      { id: 'photo-legacy-copy', storage_path: 'user-1/camera-1-legacy.jpg', sort_order: 3 },
      { id: 'photo-4', storage_path: 'user-1/camera-1-extra.jpg', sort_order: 4 },
    ],
  })

  assert.equal(CAMERA_INSTALLATION_PHOTO_LIMIT, 12)
  assert.deepEqual(gallery.map((photo) => photo.storagePath), [
    'user-1/camera-1-legacy.jpg',
    'user-1/camera-1-front.jpg',
    'user-1/camera-1-side.jpg',
    'user-1/camera-1-extra.jpg',
  ])
  assert.equal(gallery[0].isLegacy, true)
  assert.equal(gallery[1].isLegacy, false)
})
