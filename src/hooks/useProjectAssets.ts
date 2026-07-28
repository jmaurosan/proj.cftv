import { useCallback, useEffect, useState } from 'react'
import { useClient } from '../contexts/ClientContext'
import { useAuth } from './useAuth'
import {
  deleteEquipmentDocumentFile,
  deleteProjectMediaFile,
  loadProjectAssets,
  saveProjectAssets,
  uploadEquipmentDocument,
  uploadProjectMedia,
} from '../services/projectAssetsService'
import { getProjectMediaType } from '../lib/projectAssetFiles'
import { createTimedCache } from '../lib/timedCache'
import {
  validateNobreak,
  type EquipmentDocument,
  type Nobreak,
  type ProjectAssets,
  type ProjectMedia,
} from '../lib/projectAssets'

const EMPTY_ASSETS: ProjectAssets = { nobreaks: [], documents: [], media: [] }
const projectAssetsCache = createTimedCache<ProjectAssets>(2 * 60 * 1000)

export function useProjectAssets() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [assets, setAssets] = useState<ProjectAssets>(EMPTY_ASSETS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAssets = useCallback(async (force = false) => {
    if (!selectedClientId) {
      setAssets(EMPTY_ASSETS)
      setLoading(false)
      setError(null)
      return
    }
    if (!force) {
      const cached = projectAssetsCache.get(selectedClientId)
      if (cached) {
        setAssets(cached)
        setLoading(false)
        setError(null)
        return
      }
    }
    setLoading(true)
    const result = await loadProjectAssets(selectedClientId)
    if (result.error || !result.data) setError(result.error || 'Não foi possível carregar os dados do projeto.')
    else {
      setAssets(result.data)
      projectAssetsCache.set(selectedClientId, result.data)
      setError(null)
    }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { loadAssets() }, [loadAssets])

  const refresh = useCallback(() => loadAssets(true), [loadAssets])

  const persist = async (next: ProjectAssets) => {
    if (!selectedClientId) return { error: 'Selecione um cliente antes de continuar.' }
    const result = await saveProjectAssets(selectedClientId, next)
    if (!result.error) {
      setAssets(next)
      projectAssetsCache.set(selectedClientId, next)
    }
    return result
  }

  const saveNobreak = async (nobreak: Nobreak) => {
    const validationError = validateNobreak(nobreak)
    if (validationError) return { error: validationError }
    const duplicate = assets.nobreaks.find((item) => item.id !== nobreak.id && item.name.trim().toLowerCase() === nobreak.name.trim().toLowerCase())
    if (duplicate) return { error: `Já existe o nobreak "${duplicate.name}" neste projeto.` }
    const now = new Date().toISOString()
    const normalized = { ...nobreak, updatedAt: now, createdAt: nobreak.createdAt || now }
    const exists = assets.nobreaks.some((item) => item.id === nobreak.id)
    return persist({
      ...assets,
      nobreaks: exists
        ? assets.nobreaks.map((item) => item.id === nobreak.id ? normalized : item)
        : [...assets.nobreaks, normalized],
    })
  }

  const removeNobreak = async (id: string) => {
    const hasDocuments = assets.documents.some((document) => document.equipmentType === 'nobreak' && document.equipmentId === id)
    const hasMedia = assets.media.some((item) => item.equipmentType === 'nobreak' && item.equipmentId === id)
    if (hasDocuments || hasMedia) {
      return { error: 'Exclua primeiro os documentos e mídias vinculados a este nobreak.' }
    }
    return persist({ ...assets, nobreaks: assets.nobreaks.filter((item) => item.id !== id) })
  }

  const addDocument = async (
    document: Omit<EquipmentDocument, 'id' | 'fileName' | 'filePath' | 'fileSize' | 'createdAt'>,
    file: File | null,
  ) => {
    if (!selectedClientId || !user) return { error: 'Selecione um cliente e confirme sua autenticação antes de adicionar documentos.' }
    if (!document.title.trim()) return { error: 'Informe o título do documento.' }
    if (!file && !document.manufacturerUrl.trim()) return { error: 'Selecione um arquivo ou informe o link oficial.' }

    let filePath: string | null = null
    if (file) {
      const upload = await uploadEquipmentDocument(file, user.id, selectedClientId, document.equipmentType, document.equipmentId || 'project')
      if (upload.error || !upload.filePath) return { error: upload.error || 'Falha no upload do documento.' }
      filePath = upload.filePath
    }
    const nextDocument: EquipmentDocument = {
      ...document,
      id: crypto.randomUUID(),
      fileName: file?.name || null,
      filePath,
      fileSize: file?.size || null,
      createdAt: new Date().toISOString(),
    }
    const result = await persist({ ...assets, documents: [nextDocument, ...assets.documents] })
    if (result.error && filePath) await deleteEquipmentDocumentFile(filePath)
    return result
  }

  const updateDocument = async (
    id: string,
    document: Omit<EquipmentDocument, 'id' | 'fileName' | 'filePath' | 'fileSize' | 'createdAt'>,
    file: File | null,
  ) => {
    if (!selectedClientId || !user) return { error: 'Selecione um cliente e confirme sua autenticação antes de editar documentos.' }
    const currentDocument = assets.documents.find((item) => item.id === id)
    if (!currentDocument) return { error: 'Documento não encontrado.' }
    if (!document.title.trim()) return { error: 'Informe o título do documento.' }
    if (!file && !currentDocument.filePath && !document.manufacturerUrl.trim()) {
      return { error: 'Selecione um arquivo ou informe o link oficial.' }
    }

    let uploadedFilePath: string | null = null
    if (file) {
      const upload = await uploadEquipmentDocument(file, user.id, selectedClientId, document.equipmentType, document.equipmentId || 'project')
      if (upload.error || !upload.filePath) return { error: upload.error || 'Falha no upload do documento.' }
      uploadedFilePath = upload.filePath
    }

    const updatedDocument: EquipmentDocument = {
      ...currentDocument,
      ...document,
      fileName: file?.name || currentDocument.fileName,
      filePath: uploadedFilePath || currentDocument.filePath,
      fileSize: file?.size || currentDocument.fileSize,
    }
    const result = await persist({
      ...assets,
      documents: assets.documents.map((item) => item.id === id ? updatedDocument : item),
    })
    if (result.error && uploadedFilePath) await deleteEquipmentDocumentFile(uploadedFilePath)
    if (!result.error && uploadedFilePath && currentDocument.filePath) await deleteEquipmentDocumentFile(currentDocument.filePath)
    return result
  }

  const removeDocument = async (id: string) => {
    const document = assets.documents.find((item) => item.id === id)
    if (!document) return { error: 'Documento não encontrado.' }
    const result = await persist({ ...assets, documents: assets.documents.filter((item) => item.id !== id) })
    if (!result.error && document.filePath) await deleteEquipmentDocumentFile(document.filePath)
    return result
  }

  const addMedia = async (
    media: Omit<ProjectMedia, 'id' | 'mediaType' | 'fileName' | 'filePath' | 'fileSize' | 'mimeType' | 'createdAt'>,
    file: File,
  ) => {
    if (!selectedClientId || !user) return { error: 'Selecione um cliente e confirme sua autenticação antes de adicionar mídias.' }
    if (!media.title.trim()) return { error: 'Informe o título da mídia.' }
    const mediaType = getProjectMediaType(file)
    if (!mediaType) return { error: 'Selecione uma imagem ou vídeo válido.' }
    const upload = await uploadProjectMedia(file, user.id, selectedClientId, media.equipmentType, media.equipmentId || 'project')
    if (upload.error || !upload.filePath) return { error: upload.error || 'Falha no upload da mídia.' }
    const nextMedia: ProjectMedia = {
      ...media,
      id: crypto.randomUUID(),
      mediaType,
      fileName: file.name,
      filePath: upload.filePath,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: new Date().toISOString(),
    }
    const result = await persist({ ...assets, media: [nextMedia, ...assets.media] })
    if (result.error) await deleteProjectMediaFile(upload.filePath)
    return result
  }

  const updateMedia = async (
    id: string,
    media: Omit<ProjectMedia, 'id' | 'mediaType' | 'fileName' | 'filePath' | 'fileSize' | 'mimeType' | 'createdAt'>,
    file: File | null,
  ) => {
    if (!selectedClientId || !user) return { error: 'Selecione um cliente e confirme sua autenticação antes de editar mídias.' }
    const currentMedia = assets.media.find((item) => item.id === id)
    if (!currentMedia) return { error: 'Mídia não encontrada.' }
    if (!media.title.trim()) return { error: 'Informe o título da mídia.' }

    let upload: { filePath: string; error: string | null } | null = null
    let mediaType = currentMedia.mediaType
    if (file) {
      const nextMediaType = getProjectMediaType(file)
      if (!nextMediaType) return { error: 'Selecione uma imagem ou vídeo válido.' }
      const uploadResult = await uploadProjectMedia(file, user.id, selectedClientId, media.equipmentType, media.equipmentId || 'project')
      if (uploadResult.error || !uploadResult.filePath) return { error: uploadResult.error || 'Falha no upload da mídia.' }
      upload = { filePath: uploadResult.filePath, error: null }
      mediaType = nextMediaType
    }

    const updatedMedia: ProjectMedia = {
      ...currentMedia,
      ...media,
      mediaType,
      fileName: file?.name || currentMedia.fileName,
      filePath: upload?.filePath || currentMedia.filePath,
      fileSize: file?.size || currentMedia.fileSize,
      mimeType: file?.type || currentMedia.mimeType,
    }
    const result = await persist({
      ...assets,
      media: assets.media.map((item) => item.id === id ? updatedMedia : item),
    })
    if (result.error && upload?.filePath) await deleteProjectMediaFile(upload.filePath)
    if (!result.error && upload?.filePath) await deleteProjectMediaFile(currentMedia.filePath)
    return result
  }

  const removeMedia = async (id: string) => {
    const media = assets.media.find((item) => item.id === id)
    if (!media) return { error: 'Mídia não encontrada.' }
    const result = await persist({ ...assets, media: assets.media.filter((item) => item.id !== id) })
    if (!result.error) await deleteProjectMediaFile(media.filePath)
    return result
  }

  return {
    assets,
    loading,
    error,
    saveNobreak,
    removeNobreak,
    addDocument,
    updateDocument,
    removeDocument,
    addMedia,
    updateMedia,
    removeMedia,
    refresh,
  }
}
