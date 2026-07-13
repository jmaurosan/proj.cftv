import { supabase } from './supabase'
import { mergeProjectAssets, parseProjectAssets, type ProjectAssets } from '../lib/projectAssets'
import { validateEquipmentDocumentFile, validateProjectMediaFile } from '../lib/projectAssetFiles'
import { translateError } from '../lib/errorTranslator'
import { DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS } from '../lib/storageSecurity'

const BUCKET_NAME = 'device-backups'

export { validateEquipmentDocumentFile, validateProjectMediaFile } from '../lib/projectAssetFiles'

export async function loadProjectAssets(clientId: string) {
  const { data, error } = await supabase.from('clients').select('notes').eq('id', clientId).single()
  if (error) return { data: null, error: translateError(error) }
  return { data: parseProjectAssets(data?.notes), error: null }
}

export async function saveProjectAssets(clientId: string, assets: ProjectAssets) {
  const { data, error: loadError } = await supabase.from('clients').select('notes').eq('id', clientId).single()
  if (loadError) return { error: translateError(loadError) }
  const notes = mergeProjectAssets(data?.notes, assets)
  const { error } = await supabase.from('clients').update({ notes }).eq('id', clientId)
  return { error: error ? translateError(error) : null }
}

export async function uploadEquipmentDocument(
  file: File,
  clientId: string,
  equipmentType: string,
  equipmentId: string,
) {
  const validationError = validateEquipmentDocumentFile(file)
  if (validationError) return { filePath: null, error: validationError }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `documents/${clientId}/${equipmentType}/${equipmentId}/${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })
  return { filePath: error ? null : filePath, error: error ? translateError(error) : null }
}

export async function uploadProjectMedia(
  file: File,
  clientId: string,
  equipmentType: string,
  equipmentId: string,
) {
  const validationError = validateProjectMediaFile(file)
  if (validationError) return { filePath: null, error: validationError }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `media/${clientId}/${equipmentType}/${equipmentId}/${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })
  return { filePath: error ? null : filePath, error: error ? translateError(error) : null }
}

export async function deleteEquipmentDocumentFile(filePath: string) {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])
  return { error: error ? translateError(error) : null }
}

export const deleteProjectMediaFile = deleteEquipmentDocumentFile

export async function getEquipmentDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS)
  if (error) return null
  return data?.signedUrl || null
}

export const getProjectMediaUrl = getEquipmentDocumentUrl
