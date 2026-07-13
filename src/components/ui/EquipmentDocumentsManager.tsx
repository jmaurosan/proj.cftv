import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ExternalLink, FileText, Link as LinkIcon, Pencil, Trash2, Upload, X } from 'lucide-react'
import type { DocumentEquipmentType, EquipmentDocument, EquipmentDocumentCategory, EquipmentOption } from '../../lib/projectAssets'
import { getEquipmentDocumentUrl } from '../../services/projectAssetsService'
import Button from './Button'
import Input from './Input'
import Select from './Select'
import { useToast } from './Toast'

interface EquipmentDocumentsManagerProps {
  documents: EquipmentDocument[]
  equipmentOptions: EquipmentOption[]
  onAdd: (
    document: Omit<EquipmentDocument, 'id' | 'fileName' | 'filePath' | 'fileSize' | 'createdAt'>,
    file: File | null,
  ) => Promise<{ error: string | null }>
  onUpdate: (
    id: string,
    document: Omit<EquipmentDocument, 'id' | 'fileName' | 'filePath' | 'fileSize' | 'createdAt'>,
    file: File | null,
  ) => Promise<{ error: string | null }>
  onRemove: (id: string) => Promise<{ error: string | null }>
}

const CATEGORY_LABELS: Record<EquipmentDocumentCategory, string> = {
  manual: 'Manual',
  datasheet: 'Ficha técnica',
  warranty: 'Garantia',
  certificate: 'Certificado',
  diagram: 'Diagrama',
  other: 'Outro',
}

const formatSize = (bytes: number | null) => bytes ? `${(bytes / 1024 / 1024).toFixed(2).replace('.', ',')} MB` : ''

export default function EquipmentDocumentsManager({ documents, equipmentOptions, onAdd, onUpdate, onRemove }: EquipmentDocumentsManagerProps) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingDocument, setEditingDocument] = useState<EquipmentDocument | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<EquipmentDocumentCategory>('datasheet')
  const [equipmentValue, setEquipmentValue] = useState('project:project')
  const [manufacturerUrl, setManufacturerUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({})
  const isEditing = !!editingDocument

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return documents.filter((document) => {
      const equipmentKey = `${document.equipmentType}:${document.equipmentId}`
      const matchesSearch = !query || `${document.title} ${document.equipmentName} ${document.fileName || ''}`.toLocaleLowerCase('pt-BR').includes(query)
      return matchesSearch
        && (equipmentFilter === 'all' || equipmentFilter === equipmentKey)
        && (categoryFilter === 'all' || categoryFilter === document.category)
    })
  }, [categoryFilter, documents, equipmentFilter, search])

  useEffect(() => {
    let cancelled = false

    async function loadDocumentUrls() {
      const entries = await Promise.all(
        documents
          .filter((document) => document.filePath)
          .map(async (document) => [
            document.id,
            await getEquipmentDocumentUrl(document.filePath as string),
          ] as const)
      )
      if (cancelled) return
      setDocumentUrls(Object.fromEntries(entries.filter(([, url]) => !!url)) as Record<string, string>)
    }

    if (documents.some((document) => document.filePath)) loadDocumentUrls()
    else setDocumentUrls({})

    return () => {
      cancelled = true
    }
  }, [documents])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const [equipmentType, equipmentId] = equipmentValue.split(':') as [DocumentEquipmentType, string]
    const equipment = equipmentOptions.find((item) => item.type === equipmentType && item.id === equipmentId)
    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      category,
      equipmentType,
      equipmentId,
      equipmentName: equipment?.name || 'Projeto geral',
      manufacturerUrl: manufacturerUrl.trim(),
    }
    const result = editingDocument
      ? await onUpdate(editingDocument.id, payload, file)
      : await onAdd(payload, file)
    if (result.error) setError(result.error)
    else {
      resetForm()
      toast(editingDocument ? 'Documento atualizado com sucesso.' : 'Documento adicionado com sucesso.')
    }
    setSaving(false)
  }

  const resetForm = () => {
    setEditingDocument(null)
    setTitle('')
    setCategory('datasheet')
    setEquipmentValue('project:project')
    setManufacturerUrl('')
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleEdit = (document: EquipmentDocument) => {
    setEditingDocument(document)
    setTitle(document.title)
    setCategory(document.category)
    setEquipmentValue(`${document.equipmentType}:${document.equipmentId}`)
    setManufacturerUrl(document.manufacturerUrl || '')
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleRemove = async (document: EquipmentDocument) => {
    if (!confirm(`Excluir o documento "${document.title}"?`)) return
    const result = await onRemove(document.id)
    if (result.error) toast(result.error, 'error')
    else toast('Documento excluído com sucesso.')
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Documentação dos Equipamentos</h2>
        <p className="mt-1 text-sm text-text-muted">Manuais, fichas técnicas, garantias, diagramas e links oficiais.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border-y border-border-light py-4">
        {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Manual de instalação" />
          <Select label="Categoria" value={category} onChange={(e) => setCategory(e.target.value as EquipmentDocumentCategory)} options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select label="Equipamento" value={equipmentValue} onChange={(e) => setEquipmentValue(e.target.value)} options={[
            { value: 'project:project', label: 'Projeto geral' },
            ...equipmentOptions.map((item) => ({ value: `${item.type}:${item.id}`, label: `${item.typeLabel} - ${item.name}` })),
          ]} />
          <Input label="Link oficial do fabricante" type="url" value={manufacturerUrl} onChange={(e) => setManufacturerUrl(e.target.value)} placeholder="https://..." />
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> {file ? file.name : editingDocument?.fileName ? `Manter arquivo: ${editingDocument.fileName}` : 'Selecionar arquivo'}</Button>
          <Button type="submit" disabled={saving}><FileText className="h-4 w-4" /> {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar documento'}</Button>
          {isEditing && <Button type="button" variant="secondary" onClick={resetForm}><X className="h-4 w-4" /> Cancelar edição</Button>}
          <span className="text-xs text-text-muted">PDF, DOC, TXT ou imagem, até 20 MB. {isEditing ? 'Selecione um novo arquivo apenas se quiser substituir o atual.' : 'Arquivo ou link é obrigatório.'}</span>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input label="Buscar documentos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, arquivo ou equipamento" />
        <Select label="Filtrar por equipamento" value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)} options={[
          { value: 'all', label: 'Todos os equipamentos' },
          { value: 'project:project', label: 'Projeto geral' },
          ...equipmentOptions.map((item) => ({ value: `${item.type}:${item.id}`, label: `${item.typeLabel} - ${item.name}` })),
        ]} />
        <Select label="Filtrar por categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} options={[
          { value: 'all', label: 'Todas as categorias' },
          ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
        ]} />
      </div>

      {documents.length === 0 ? (
        <div className="border border-dashed border-border-light py-10 text-center text-sm text-text-muted">Nenhum documento cadastrado.</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="border border-dashed border-border-light py-10 text-center text-sm text-text-muted">Nenhum documento encontrado com os filtros atuais.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filteredDocuments.map((document) => (
            <article key={document.id} className="flex items-start gap-3 rounded-lg border border-border-light bg-bg-primary/35 p-3">
              <div className="rounded-md bg-accent/10 p-2 text-accent"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div><h3 className="truncate text-sm font-semibold text-text-primary">{document.title}</h3><p className="text-xs text-text-muted">{CATEGORY_LABELS[document.category]} · {document.equipmentName}</p></div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => handleEdit(document)} title="Editar documento" className="p-1.5 text-text-muted hover:text-accent"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => handleRemove(document)} title="Excluir documento" className="p-1.5 text-text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {document.filePath && documentUrls[document.id] && <a href={documentUrls[document.id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" /> {document.fileName} {formatSize(document.fileSize)}</a>}
                  {document.manufacturerUrl && <a href={document.manufacturerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-400 hover:underline"><LinkIcon className="h-3.5 w-3.5" /> Link oficial</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
