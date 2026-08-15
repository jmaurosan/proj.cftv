import { supabase } from './supabase'
import type { DeviceBackup } from '../lib/types'
import { DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS, buildDeviceBackupPath } from '../lib/storageSecurity'

const BUCKET_NAME = 'device-backups'

export async function uploadDeviceBackup(
  file: File,
  userId: string,
  clientId: string | null,
  equipmentType: 'router' | 'switch' | 'dvr',
  equipmentId: string,
  notes?: string
): Promise<{ data: DeviceBackup | null; error: string | null }> {
  try {
    const filePath = buildDeviceBackupPath({
      userId,
      equipmentType,
      equipmentId,
      fileName: file.name,
    })

    // 1. Upload no Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      return { data: null, error: uploadError.message }
    }

    // 2. Inserir registro na tabela device_backups
    const { data: dbData, error: dbError } = await supabase
      .from('device_backups')
      .insert({
        client_id: clientId || null,
        equipment_type: equipmentType,
        equipment_id: equipmentId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        notes: notes || null,
        user_id: userId,
      })
      .select()
      .single()

    if (dbError) {
      // Se falhar no banco de dados, tenta remover o arquivo do storage para não deixar órfão
      await supabase.storage.from(BUCKET_NAME).remove([filePath])
      return { data: null, error: dbError.message }
    }

    return { data: dbData as DeviceBackup, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado no upload'
    return { data: null, error: message }
  }
}

export async function listDeviceBackups(equipmentId: string): Promise<{ data: DeviceBackup[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('device_backups')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data as DeviceBackup[]) || [], error: null }
  } catch (err: any) {
    return { data: [], error: err.message || 'Erro ao listar backups' }
  }
}

export async function deleteDeviceBackup(backupId: string, filePath: string): Promise<{ error: string | null }> {
  try {
    // 1. Remover do Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (storageError) {
      return { error: storageError.message }
    }

    // 2. Remover do Banco
    const { error: dbError } = await supabase
      .from('device_backups')
      .delete()
      .eq('id', backupId)

    if (dbError) {
      return { error: dbError.message }
    }

    return { error: null }
  } catch (err: any) {
    return { error: err.message || 'Erro ao deletar backup' }
  }
}

export async function getBackupDownloadUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, DEVICE_BACKUP_SIGNED_URL_EXPIRES_SECONDS)
  if (error) return null
  return data?.signedUrl || null
}
