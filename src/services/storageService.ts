import { supabase } from './supabase'
import { PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS, resolveStorageObjectPath } from '../lib/storageSecurity'

interface ImageCompressionOptions {
  maxDimension: number
  quality: number
  minBytes?: number
}

const canCompressImage = (file: File) =>
  file.type.startsWith('image/') &&
  file.type !== 'image/gif' &&
  file.type !== 'image/svg+xml'

const loadImageFromFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Nao foi possivel ler a imagem'))
    }
    image.src = objectUrl
  })

async function compressImage(
  file: File,
  options?: ImageCompressionOptions
) {
  if (!options || !canCompressImage(file)) return file
  if (options.minBytes && file.size <= options.minBytes) return file

  try {
    const image = await loadImageFromFile(file)
    const scale = Math.min(1, options.maxDimension / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', options.quality)
    })
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

/**
 * Upload gen├®rico para qualquer bucket do Supabase Storage.
 * Mant├®m o path no formato `{userId}/{refId}-{timestamp}.{ext}` para que as
 * policies por usu├írio (auth.uid() = split_part(name, '/', 1)::uuid) funcionem.
 */
async function uploadImage(
  bucket: string,
  file: File,
  userId: string,
  refId?: string,
  compression?: ImageCompressionOptions
): Promise<{ url: string | null; error: string | null }> {
  const timestamp = Date.now()
  const uploadFile = await compressImage(file, compression)
  const fileExt = uploadFile.name.split('.').pop() || 'jpg'
  const fileName = `${userId}/${refId || 'new'}-${timestamp}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, uploadFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: uploadFile.type || undefined,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message }
  }

  return { url: fileName, error: null }
}

/**
 * Remove uma imagem de um bucket a partir do path privado ou de uma URL pública legada.
 */
async function deleteImage(
  bucket: string,
  storedValue: string
): Promise<{ error: string | null }> {
  try {
    const filePath = resolveStorageObjectPath(storedValue, bucket)
    if (!filePath) return { error: 'URL invalida' }

    const { error } = await supabase.storage.from(bucket).remove([filePath])
    if (error) return { error: error.message }

    return { error: null }
  } catch {
    return { error: 'Falha ao remover imagem' }
  }
}

async function getPrivateImageUrl(bucket: string, storedValue: string) {
  const filePath = resolveStorageObjectPath(storedValue, bucket)
  if (!filePath) return null
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS)
  if (error) return null
  return data?.signedUrl || null
}

// ============================================
// QR Code (bucket: qr-codes)
// ============================================

export function uploadQRCodeImage(file: File, userId: string, cameraId?: string) {
  return uploadImage('qr-codes', file, userId, cameraId, {
    maxDimension: 1400,
    quality: 0.9,
    minBytes: 600 * 1024,
  })
}

export function deleteQRCodeImage(url: string) {
  return deleteImage('qr-codes', url)
}

export function getQRCodeImageUrl(storedValue: string) {
  return getPrivateImageUrl('qr-codes', storedValue)
}

// ============================================
// Foto do local de instala├º├úo (bucket: installation-photos)
// ============================================

export function uploadInstallationPhoto(file: File, userId: string, cameraId?: string) {
  return uploadImage('installation-photos', file, userId, cameraId, {
    maxDimension: 1600,
    quality: 0.78,
    minBytes: 300 * 1024,
  })
}

export function deleteInstallationPhoto(url: string) {
  return deleteImage('installation-photos', url)
}

export function getInstallationPhotoUrl(storedValue: string) {
  return getPrivateImageUrl('installation-photos', storedValue)
}
