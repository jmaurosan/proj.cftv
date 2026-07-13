import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Image as ImageIcon, Pencil, Play, Trash2, Upload, X } from 'lucide-react'
import type { DocumentEquipmentType, EquipmentOption, ProjectMedia } from '../../lib/projectAssets'
import { getProjectMediaUrl } from '../../services/projectAssetsService'
import Button from './Button'
import Input from './Input'
import Select from './Select'
import { useToast } from './Toast'

interface ProjectMediaManagerProps {
  media: ProjectMedia[]
  equipmentOptions: EquipmentOption[]
  onAdd: (
    media: Omit<ProjectMedia, 'id' | 'mediaType' | 'fileName' | 'filePath' | 'fileSize' | 'mimeType' | 'createdAt'>,
    file: File,
  ) => Promise<{ error: string | null }>
  onUpdate: (
    id: string,
    media: Omit<ProjectMedia, 'id' | 'mediaType' | 'fileName' | 'filePath' | 'fileSize' | 'mimeType' | 'createdAt'>,
    file: File | null,
  ) => Promise<{ error: string | null }>
  onRemove: (id: string) => Promise<{ error: string | null }>
}

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2).replace('.', ',')} MB`

export default function ProjectMediaManager({ media, equipmentOptions, onAdd, onUpdate, onRemove }: ProjectMediaManagerProps) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingMedia, setEditingMedia] = useState<ProjectMedia | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [recordedAt, setRecordedAt] = useState('')
  const [equipmentValue, setEquipmentValue] = useState('project:project')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const isEditing = !!editingMedia

  const filteredMedia = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return media.filter((item) => {
      const equipmentKey = `${item.equipmentType}:${item.equipmentId}`
      const matchesSearch = !query || `${item.title} ${item.description} ${item.equipmentName}`.toLocaleLowerCase('pt-BR').includes(query)
      return matchesSearch
        && (equipmentFilter === 'all' || equipmentFilter === equipmentKey)
        && (typeFilter === 'all' || typeFilter === item.mediaType)
    })
  }, [equipmentFilter, media, search, typeFilter])

  useEffect(() => {
    let cancelled = false

    async function loadMediaUrls() {
      const entries = await Promise.all(
        media.map(async (item) => [
          item.id,
          await getProjectMediaUrl(item.filePath),
        ] as const)
      )
      if (cancelled) return
      setMediaUrls(Object.fromEntries(entries.filter(([, url]) => !!url)) as Record<string, string>)
    }

    if (media.length > 0) loadMediaUrls()
    else setMediaUrls({})

    return () => {
      cancelled = true
    }
  }, [media])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file && !editingMedia) {
      setError('Selecione uma foto ou vídeo.')
      return
    }
    const [equipmentType, equipmentId] = equipmentValue.split(':') as [DocumentEquipmentType, string]
    const equipment = equipmentOptions.find((item) => item.type === equipmentType && item.id === equipmentId)
    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      equipmentType,
      equipmentId,
      equipmentName: equipment?.name || 'Projeto geral',
      recordedAt: recordedAt || null,
    }
    const result = editingMedia
      ? await onUpdate(editingMedia.id, payload, file)
      : await onAdd(payload, file as File)
    if (result.error) setError(result.error)
    else {
      resetForm()
      toast(editingMedia ? 'Mídia atualizada com sucesso.' : 'Mídia adicionada com sucesso.')
    }
    setSaving(false)
  }

  const resetForm = () => {
    setEditingMedia(null)
    setTitle('')
    setDescription('')
    setRecordedAt('')
    setEquipmentValue('project:project')
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleEdit = (item: ProjectMedia) => {
    setEditingMedia(item)
    setTitle(item.title)
    setDescription(item.description || '')
    setRecordedAt(item.recordedAt || '')
    setEquipmentValue(`${item.equipmentType}:${item.equipmentId}`)
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleRemove = async (item: ProjectMedia) => {
    if (!confirm(`Excluir a mídia "${item.title}"?`)) return
    const result = await onRemove(item.id)
    if (result.error) toast(result.error, 'error')
    else toast('Mídia excluída com sucesso.')
  }

  const equipmentSelectOptions = [
    { value: 'project:project', label: 'Projeto geral' },
    ...equipmentOptions.map((item) => ({ value: `${item.type}:${item.id}`, label: `${item.typeLabel} - ${item.name}` })),
  ]

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Fotos e Vídeos do Projeto</h2>
        <p className="mt-1 text-sm text-text-muted">Registros da instalação, infraestrutura, equipamentos e manutenções.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border-y border-border-light py-4">
        {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Título" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Foto do rack principal" />
          <Input label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detalhes opcionais" />
          <Select label="Vincular a" value={equipmentValue} onChange={(event) => setEquipmentValue(event.target.value)} options={equipmentSelectOptions} />
          <Input label="Data do registro" type="date" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} />
        </div>
        <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> {file ? file.name : editingMedia?.fileName ? `Manter arquivo: ${editingMedia.fileName}` : 'Selecionar foto ou vídeo'}</Button>
          <Button type="submit" disabled={saving}><ImageIcon className="h-4 w-4" /> {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar mídia'}</Button>
          {isEditing && <Button type="button" variant="secondary" onClick={resetForm}><X className="h-4 w-4" /> Cancelar edição</Button>}
          <span className="text-xs text-text-muted">{isEditing ? 'Selecione um novo arquivo apenas se quiser substituir o atual.' : 'Imagens até 20 MB; vídeos MP4 ou WEBM até 100 MB.'}</span>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input label="Buscar mídias" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, descrição ou equipamento" />
        <Select label="Filtrar por equipamento" value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)} options={[{ value: 'all', label: 'Todos os equipamentos' }, ...equipmentSelectOptions]} />
        <Select label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} options={[{ value: 'all', label: 'Fotos e vídeos' }, { value: 'image', label: 'Somente fotos' }, { value: 'video', label: 'Somente vídeos' }]} />
      </div>

      {media.length === 0 ? (
        <div className="border border-dashed border-border-light py-12 text-center text-sm text-text-muted">Nenhuma foto ou vídeo cadastrado.</div>
      ) : filteredMedia.length === 0 ? (
        <div className="border border-dashed border-border-light py-12 text-center text-sm text-text-muted">Nenhuma mídia encontrada com os filtros atuais.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMedia.map((item) => {
            const url = mediaUrls[item.id]
            return (
              <article key={item.id} className="min-w-0 overflow-hidden rounded-lg border border-border-light bg-bg-secondary">
                <div className="aspect-video bg-bg-primary">
                  {!url ? (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">Preparando mídia...</div>
                  ) : item.mediaType === 'image'
                    ? <img src={url} alt={item.description || item.title} loading="lazy" className="h-full w-full object-cover" />
                    : <video src={url} controls preload="metadata" className="h-full w-full" aria-label={item.title} />}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-text-primary">{item.title}</h3><p className="text-xs text-text-muted">{item.equipmentName} · {formatSize(item.fileSize)}</p></div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => handleEdit(item)} title="Editar mídia" className="p-1.5 text-text-muted hover:text-accent"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleRemove(item)} title="Excluir mídia" className="p-1.5 text-text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-text-muted"><span className="inline-flex items-center gap-1">{item.mediaType === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{item.mediaType === 'image' ? 'Foto' : 'Vídeo'}</span>{item.recordedAt && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(`${item.recordedAt}T00:00:00`).toLocaleDateString('pt-BR')}</span>}</div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
