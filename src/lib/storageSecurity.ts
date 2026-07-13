export const DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS = 60 * 10
export const PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS = 60 * 10

const sanitizeStorageFileName = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, '_')

export function buildDeviceBackupPath({
  userId,
  equipmentType,
  equipmentId,
  fileName,
  timestamp = Date.now(),
}: {
  userId: string
  equipmentType: 'router' | 'switch' | 'dvr'
  equipmentId: string
  fileName: string
  timestamp?: number
}) {
  return `${userId}/${equipmentType}/${equipmentId}/${timestamp}_${sanitizeStorageFileName(fileName)}`
}

export function isDeviceBackupPathOwnedByUser(filePath: string, userId: string) {
  return filePath.split('/')[0] === userId
}

export function resolveStorageObjectPath(value: string, bucket: string) {
  if (!value.trim()) return null
  if (!/^https?:\/\//i.test(value)) return value

  try {
    const url = new URL(value)
    const parts = url.pathname.split('/')
    const bucketIndex = parts.indexOf(bucket)
    if (bucketIndex === -1) return null
    const path = parts.slice(bucketIndex + 1).join('/')
    return path || null
  } catch {
    return null
  }
}
