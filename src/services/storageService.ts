import { supabase } from './supabase'

/**
 * Upload gen├®rico para qualquer bucket do Supabase Storage.
 * Mant├®m o path no formato `{userId}/{refId}-{timestamp}.{ext}` para que as
 * policies por usu├írio (auth.uid() = split_part(name, '/', 1)::uuid) funcionem.
 */
async function uploadImage(
  bucket: string,
  file: File,
  userId: string,
  refId?: string
): Promise<{ url: string | null; error: string | null }> {
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${userId}/${refId || 'new'}-${timestamp}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message }
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  return { url: publicUrlData?.publicUrl || null, error: null }
}

/**
 * Remove uma imagem de um bucket a partir da URL p├║blica.
 */
async function deleteImage(
  bucket: string,
  url: string
): Promise<{ error: string | null }> {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const bucketIndex = pathParts.indexOf(bucket)
    if (bucketIndex === -1) return { error: 'URL inv├ílida' }

    const filePath = pathParts.slice(bucketIndex + 1).join('/')

    const { error } = await supabase.storage.from(bucket).remove([filePath])
    if (error) return { error: error.message }

    return { error: null }
  } catch {
    return { error: 'Falha ao remover imagem' }
  }
}

// ============================================
// QR Code (bucket: qr-codes)
// ============================================

export function uploadQRCodeImage(file: File, userId: string, cameraId?: string) {
  return uploadImage('qr-codes', file, userId, cameraId)
}

export function deleteQRCodeImage(url: string) {
  return deleteImage('qr-codes', url)
}

// ============================================
// Foto do local de instala├º├úo (bucket: installation-photos)
// ============================================

export function uploadInstallationPhoto(file: File, userId: string, cameraId?: string) {
  return uploadImage('installation-photos', file, userId, cameraId)
}

export function deleteInstallationPhoto(url: string) {
  return deleteImage('installation-photos', url)
}
