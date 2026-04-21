import { supabase } from '../lib/supabase'

/**
 * Faz upload de uma imagem (foto) para o bucket 'qr-codes' no Supabase Storage.
 * Retorna a URL pública da imagem.
 */
export async function uploadQRCodeImage(
  file: File,
  userId: string,
  cameraId?: string
): Promise<{ url: string | null; error: string | null }> {
  // Nome único do arquivo
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${userId}/${cameraId || 'new'}-${timestamp}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('qr-codes')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message }
  }

  // Obtém URL pública
  const { data: publicUrlData } = supabase.storage
    .from('qr-codes')
    .getPublicUrl(fileName)

  return { url: publicUrlData?.publicUrl || null, error: null }
}

/**
 * Remove uma imagem do Supabase Storage a partir da URL pública.
 */
export async function deleteQRCodeImage(url: string): Promise<{ error: string | null }> {
  try {
    const urlObj = new URL(url)
    // A URL pública do Supabase tem formato: .../storage/v1/object/public/qr-codes/userId/filename
    const pathParts = urlObj.pathname.split('/')
    const bucketIndex = pathParts.indexOf('qr-codes')
    if (bucketIndex === -1) return { error: 'URL inválida' }

    const filePath = pathParts.slice(bucketIndex + 1).join('/')

    const { error } = await supabase.storage.from('qr-codes').remove([filePath])
    if (error) return { error: error.message }

    return { error: null }
  } catch {
    return { error: 'Falha ao remover imagem' }
  }
}
