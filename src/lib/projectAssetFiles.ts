import type { ProjectMediaType } from './projectAssets'

type ProjectAssetFile = Pick<File, 'name' | 'size' | 'type'>

const MB = 1024 * 1024
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp']
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const VIDEO_EXTENSIONS = ['mp4', 'webm']

const extensionOf = (file: ProjectAssetFile) => file.name.split('.').pop()?.toLowerCase() || ''

export function validateEquipmentDocumentFile(file: ProjectAssetFile) {
  if (!DOCUMENT_EXTENSIONS.includes(extensionOf(file))) return 'Formato não permitido. Use PDF, DOC, DOCX, TXT ou imagem.'
  if (file.size > 20 * MB) return 'O arquivo deve ter no máximo 20 MB.'
  return null
}

export function getProjectMediaType(file: ProjectAssetFile): ProjectMediaType | null {
  const extension = extensionOf(file)
  if (IMAGE_EXTENSIONS.includes(extension) && file.type.startsWith('image/')) return 'image'
  if (VIDEO_EXTENSIONS.includes(extension) && file.type.startsWith('video/')) return 'video'
  return null
}

export function validateProjectMediaFile(file: ProjectAssetFile) {
  const extension = extensionOf(file)
  if (![...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS].includes(extension)) {
    return 'Formato não permitido. Use JPG, PNG, WEBP, MP4 ou WEBM.'
  }
  const mediaType = getProjectMediaType(file)
  if (!mediaType) return 'O tipo do arquivo não corresponde à extensão informada.'
  if (mediaType === 'image' && file.size > 20 * MB) return 'A imagem deve ter no máximo 20 MB.'
  if (mediaType === 'video' && file.size > 100 * MB) return 'O vídeo deve ter no máximo 100 MB.'
  return null
}
