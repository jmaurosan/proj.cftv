import { useMemo, useState } from 'react'
import { BookOpen, FileText, FolderKanban, Image, Layers3, Video } from 'lucide-react'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import EquipmentDocumentsManager from '../components/ui/EquipmentDocumentsManager'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ProjectMediaManager from '../components/ui/ProjectMediaManager'
import { useClient } from '../contexts/ClientContext'
import { useProjectAssets } from '../hooks/useProjectAssets'
import { useEquipmentOptions } from '../hooks/useEquipmentOptions'
import type { DocumentEquipmentType, EquipmentOption } from '../lib/projectAssets'

type LibraryTab = 'documents' | 'media' | 'equipment'

export default function DocumentsMediaPage() {
  const { selectedClientId } = useClient()
  const { assets, loading, error, addDocument, updateDocument, removeDocument, addMedia, updateMedia, removeMedia } = useProjectAssets()
  const { options: equipmentOptions, error: equipmentError } = useEquipmentOptions(selectedClientId)
  const [activeTab, setActiveTab] = useState<LibraryTab>('documents')

  const allEquipmentOptions = useMemo<EquipmentOption[]>(() => [
    ...equipmentOptions,
    ...assets.nobreaks.map((item) => ({ id: item.id, name: item.name, type: 'nobreak', typeLabel: 'Nobreak' } as const)),
  ], [assets.nobreaks, equipmentOptions])

  const equipmentSummary = useMemo(() => {
    const options: EquipmentOption[] = [{ id: 'project', name: 'Projeto geral', type: 'project', typeLabel: 'Projeto' }, ...allEquipmentOptions]
    return options.map((equipment) => {
      const matches = (type: DocumentEquipmentType, id: string) => type === equipment.type && id === equipment.id
      return {
        ...equipment,
        documents: assets.documents.filter((item) => matches(item.equipmentType, item.equipmentId)).length,
        images: assets.media.filter((item) => item.mediaType === 'image' && matches(item.equipmentType, item.equipmentId)).length,
        videos: assets.media.filter((item) => item.mediaType === 'video' && matches(item.equipmentType, item.equipmentId)).length,
      }
    }).filter((item) => item.documents + item.images + item.videos > 0)
  }, [allEquipmentOptions, assets.documents, assets.media])

  if (loading) return <LoadingSpinner />

  const tabs: Array<{ id: LibraryTab; label: string; icon: typeof FileText }> = [
    { id: 'documents', label: 'Documentos técnicos', icon: FileText },
    { id: 'media', label: 'Fotos e vídeos', icon: Image },
    { id: 'equipment', label: 'Visão por equipamento', icon: Layers3 },
  ]

  return (
    <div className="space-y-7">
      <ClientFilterBanner />
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-text-primary"><FolderKanban className="h-5 w-5 text-accent" /> Documentos e Mídias</h1>
        <p className="mt-1 text-sm text-text-muted">Acervo técnico e registros visuais de todos os equipamentos deste projeto.</p>
      </header>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {equipmentError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{equipmentError}</div>}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-light bg-border-light lg:grid-cols-4">
        {[
          { label: 'Documentos', value: assets.documents.length, icon: FileText },
          { label: 'Manuais', value: assets.documents.filter((item) => item.category === 'manual').length, icon: BookOpen },
          { label: 'Fotos', value: assets.media.filter((item) => item.mediaType === 'image').length, icon: Image },
          { label: 'Vídeos', value: assets.media.filter((item) => item.mediaType === 'video').length, icon: Video },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="bg-bg-secondary p-4"><div className="flex items-center gap-2 text-xs text-text-muted"><Icon className="h-4 w-4 text-accent" /> {label}</div><div className="mt-1 text-2xl font-bold text-text-primary">{value}</div></div>)}
      </div>

      <nav aria-label="Seções da biblioteca" className="flex gap-1 overflow-x-auto border-b border-border-light">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${activeTab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>

      {activeTab === 'documents' && <EquipmentDocumentsManager documents={assets.documents} equipmentOptions={allEquipmentOptions} onAdd={addDocument} onUpdate={updateDocument} onRemove={removeDocument} />}
      {activeTab === 'media' && <ProjectMediaManager media={assets.media} equipmentOptions={allEquipmentOptions} onAdd={addMedia} onUpdate={updateMedia} onRemove={removeMedia} />}
      {activeTab === 'equipment' && (
        <section className="space-y-4">
          <div><h2 className="text-lg font-bold text-text-primary">Arquivos por Equipamento</h2><p className="mt-1 text-sm text-text-muted">Resumo dos vínculos cadastrados no projeto.</p></div>
          {equipmentSummary.length === 0 ? <div className="border border-dashed border-border-light py-12 text-center text-sm text-text-muted">Nenhum equipamento possui arquivos vinculados.</div> : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{equipmentSummary.map((item) => (
              <article key={`${item.type}:${item.id}`} className="rounded-lg border border-border-light bg-bg-secondary p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">{item.typeLabel}</p>
                <h3 className="mt-1 truncate font-semibold text-text-primary">{item.name}</h3>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded bg-bg-primary p-2"><strong className="block text-lg text-text-primary">{item.documents}</strong><span className="text-text-muted">Documentos</span></div><div className="rounded bg-bg-primary p-2"><strong className="block text-lg text-text-primary">{item.images}</strong><span className="text-text-muted">Fotos</span></div><div className="rounded bg-bg-primary p-2"><strong className="block text-lg text-text-primary">{item.videos}</strong><span className="text-text-muted">Vídeos</span></div></div>
              </article>
            ))}</div>
          )}
        </section>
      )}
    </div>
  )
}
