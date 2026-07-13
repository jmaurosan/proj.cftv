import { supabase } from '../lib/supabase'
import type { CameraInstallationPhoto } from '../lib/types'
import { translateError } from '../lib/errorTranslator'

const SELECT_FIELDS = 'id, camera_id, storage_path, label, sort_order, user_id, created_at, updated_at'

export async function listCameraInstallationPhotos(cameraId: string) {
  const { data, error } = await supabase
    .from('camera_installation_photos')
    .select(SELECT_FIELDS)
    .eq('camera_id', cameraId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return { data: [] as CameraInstallationPhoto[], error: translateError(error) }
  return { data: (data || []) as CameraInstallationPhoto[], error: null }
}

export async function createCameraInstallationPhoto(payload: {
  cameraId: string
  storagePath: string
  userId: string
  label?: string | null
  sortOrder: number
}) {
  const { data, error } = await supabase
    .from('camera_installation_photos')
    .insert({
      camera_id: payload.cameraId,
      storage_path: payload.storagePath,
      label: payload.label ?? null,
      sort_order: payload.sortOrder,
      user_id: payload.userId,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) return { data: null, error: translateError(error) }
  return { data: data as CameraInstallationPhoto, error: null }
}

export async function deleteCameraInstallationPhoto(photoId: string) {
  const { error } = await supabase.from('camera_installation_photos').delete().eq('id', photoId)
  if (error) return { error: translateError(error) }
  return { error: null }
}
