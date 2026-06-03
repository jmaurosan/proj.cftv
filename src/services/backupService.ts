import { supabase } from './supabase'
import type { DeviceBackup } from '../lib/types'

const BUCKET_NAME = 'device-backups'

export async function uploadDeviceBackup(
  file: File,
  clientId: string | null,
  equipmentType: 'router' | 'switch' | 'dvr',
  equipmentId: string,
  notes?: string
): Promise<{ data: DeviceBackup | null; error: string | null }> {
  try {
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${equipmentType}/${equipmentId}/${timestamp}_${sanitizedFileName}`

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
      })
      .select()
      .single()

    if (dbError) {
      // Se falhar no banco de dados, tenta remover o arquivo do storage para não deixar órfão
      await supabase.storage.from(BUCKET_NAME).remove([filePath])
      return { data: null, error: dbError.message }
    }

    return { data: dbData as DeviceBackup, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro inesperado no upload' }
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

export function getBackupDownloadUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
  return data?.publicUrl || ''
}
