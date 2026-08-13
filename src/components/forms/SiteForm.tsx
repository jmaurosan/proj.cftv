import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { InstallationSite, SiteType } from '../../lib/types'
import { SITE_TYPES } from '../../lib/constants'
import { useSites } from '../../hooks/useSites'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface SiteFormProps {
  siteId?: string
  onClose: () => void
  onSaved?: () => void
}

const NONE_OPTION = { value: '', label: '— Sem site pai —' }

export default function SiteForm({ siteId, onClose, onSaved }: SiteFormProps) {
  const { data: sites, loading: loadingSites, create, update, remove } = useSites()

  const [name, setName] = useState('')
  const [siteType, setSiteType] = useState<SiteType>('outro')
  const [parentSiteId, setParentSiteId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  const target = useMemo<InstallationSite | null>(
    () => (siteId ? sites.find((s) => s.id === siteId) ?? null : null),
    [sites, siteId],
  )

  useEffect(() => {
    if (!target || loadedId === target.id) return
    setLoadedId(target.id)
    setName(target.name)
    setSiteType(target.site_type)
    setParentSiteId(target.parent_site_id ?? '')
    setNotes(target.notes ?? '')
  }, [target, loadedId])

  // Opções de site pai: qualquer site, exceto o próprio site sendo editado
  const parentOptions = useMemo(() => {
    const filtered = sites.filter((s) => s.id !== siteId)
    return [NONE_OPTION, ...filtered.map((s) => ({ value: s.id, label: s.name }))]
  }, [sites, siteId])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    if (!name.trim()) {
      setError('Nome é obrigatório.')
      setSaving(false)
      return
    }

    const payload = {
      name: name.trim(),
      site_type: siteType,
      parent_site_id: parentSiteId || null,
      notes: notes.trim() || null,
    }

    const result = loadedId
      ? await update(loadedId, payload)
      : await create(payload)

    if (result.error) setError(result.error)
    else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  const handleRemove = async () => {
    if (!loadedId) return
    if (!window.confirm('Remover este site? Câmeras e roteadores vinculados ficarão sem site.')) return
    setSaving(true)
    const result = await remove(loadedId)
    if (result.error) setError(result.error)
    else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  if (loadingSites && siteId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome do site"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Elevador Social Direito"
          required
        />
        <Select
          label="Tipo"
          value={siteType}
          onChange={(e) => setSiteType(e.target.value as SiteType)}
          options={SITE_TYPES}
          required
        />
      </div>

      <Select
        label="Site pai (opcional)"
        value={parentSiteId}
        onChange={(e) => setParentSiteId(e.target.value)}
        options={parentOptions}
      />
      <p className="text-xs text-text-muted">
        Use quando o site fizer parte de outro (ex: "Elevador 1" dentro de "Bloco A").
      </p>

      <Input
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas técnicas, referências físicas, etc."
      />

      <div className="flex justify-between pt-2">
        <div>
          {loadedId && (
            <Button type="button" variant="secondary" onClick={handleRemove} disabled={saving}>
              Remover site
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </form>
  )
}
