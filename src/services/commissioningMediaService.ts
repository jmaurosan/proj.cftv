import { supabase } from '../lib/supabase'
import { PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS } from '../lib/storageSecurity'

export const COMMISSIONING_MEDIA_LIMIT = 4
const BUCKET = 'commissioning-media'
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
])

const safeFileName = (name: string) => name
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'midia'

export async function uploadCommissioningMedia(args: {
  file: File
  clientId: string
  userId: string
  commissioningId: string
}) {
  if (!ALLOWED_TYPES.has(args.file.type)) return { data: null, error: 'Formato de mídia não permitido.' }
  if (args.file.size > 50 * 1024 * 1024) return { data: null, error: 'Cada mídia pode ter no máximo 50 MB.' }
  const path = `${args.clientId}/${args.userId}/${args.commissioningId}/${Date.now()}-${safeFileName(args.file.name)}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, args.file, {
    contentType: args.file.type,
    cacheControl: '3600',
  })
  if (uploadError) return { data: null, error: uploadError.message }
  const { data, error } = await supabase.from('commissioning_media').insert({
    client_id: args.clientId,
    commissioning_id: args.commissioningId,
    storage_path: path,
    file_name: args.file.name,
    media_type: args.file.type.startsWith('video/') ? 'video' : 'image',
    mime_type: args.file.type,
    size_bytes: args.file.size,
    user_id: args.userId,
  }).select('id,commissioning_id,storage_path,file_name,media_type,mime_type,size_bytes,created_at').single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function deleteCommissioningMedia(id: string, storagePath: string) {
  const { error } = await supabase.from('commissioning_media').delete().eq('id', id)
  if (error) return error.message
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])
  return storageError?.message ?? null
}

export async function getCommissioningMediaUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(
    storagePath,
    PRIVATE_IMAGE_SIGNED_URL_EXPIRES_SECONDS,
  )
  return error ? null : data.signedUrl
}
