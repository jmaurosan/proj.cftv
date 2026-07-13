export const CAMERA_INSTALLATION_PHOTO_LIMIT = 12

export type CameraInstallationMediaKind = 'image' | 'video'

export interface CameraInstallationPhotoRecord {
  id?: string
  storage_path: string | null
  sort_order: number | null
}

export interface CameraPhotoGalleryItem {
  id: string | null
  storagePath: string
  sortOrder: number
  isLegacy: boolean
  mediaKind: CameraInstallationMediaKind
}

export function getCameraInstallationMediaKind(storagePath: string): CameraInstallationMediaKind {
  const cleanPath = storagePath.split('?')[0]?.toLocaleLowerCase('pt-BR') ?? ''
  return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(cleanPath) ? 'video' : 'image'
}

export function buildCameraPhotoGallery({
  legacyPhotoUrl,
  photos,
}: {
  legacyPhotoUrl?: string | null
  photos: CameraInstallationPhotoRecord[]
}): CameraPhotoGalleryItem[] {
  const seen = new Set<string>()
  const items: CameraPhotoGalleryItem[] = []

  const addPhoto = (photo: Omit<CameraPhotoGalleryItem, 'mediaKind'>) => {
    const storagePath = photo.storagePath.trim()
    if (!storagePath || seen.has(storagePath)) return
    seen.add(storagePath)
    items.push({ ...photo, storagePath, mediaKind: getCameraInstallationMediaKind(storagePath) })
  }

  if (legacyPhotoUrl) {
    addPhoto({
      id: null,
      storagePath: legacyPhotoUrl,
      sortOrder: 0,
      isLegacy: true,
    })
  }

  photos
    .filter((photo) => photo.storage_path)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    .forEach((photo, index) => {
      addPhoto({
        id: photo.id ?? null,
        storagePath: photo.storage_path || '',
        sortOrder: photo.sort_order ?? index + 1,
        isLegacy: false,
      })
    })

  return items.slice(0, CAMERA_INSTALLATION_PHOTO_LIMIT)
}
