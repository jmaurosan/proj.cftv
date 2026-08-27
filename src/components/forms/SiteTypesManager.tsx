import { useMemo, useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Tags, X } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useSiteTypes } from '../../hooks/useSiteTypes'
import type { InstallationSite } from '../../lib/types'

interface SiteTypesManagerProps {
  sites: InstallationSite[]
}

export default function SiteTypesManager({ sites }: SiteTypesManagerProps) {
  const { customTypes, loading, error: loadError, create, update } = useSiteTypes()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    sites.forEach((site) => counts.set(site.site_type, (counts.get(site.site_type) ?? 0) + 1))
    return counts
  }, [sites])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    const result = await create(newName)
    if (result.error) setError(result.error)
    else setNewName('')
    setSaving(false)
  }

  const saveName = async (id: string) => {
    if (!editingName.trim()) return
    setSaving(true)
    setError(null)
    const result = await update(id, { name: editingName.trim() })
    if (result.error) setError(result.error)
    else setEditingId(null)
    setSaving(false)
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    setSaving(true)
    setError(null)
    const result = await update(id, { is_active: !isActive })
    if (result.error) setError(result.error)
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border-light bg-bg-tertiary/40 p-3 text-sm text-text-secondary">
        <div className="flex gap-2">
          <Tags className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>Os tipos padrão do sistema permanecem protegidos. Crie abaixo somente as classificações específicas da sua operação.</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Novo tipo de local"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ex: Piscina, Casa de máquinas..."
          />
        </div>
        <Button type="submit" disabled={saving || !newName.trim()}>
          <Plus className="h-4 w-4" /> Criar tipo
        </Button>
      </form>

      {(error || loadError) && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error || loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border-light">
        {loading ? (
          <p className="p-4 text-sm text-text-muted">Carregando tipos...</p>
        ) : customTypes.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">Nenhum tipo personalizado criado.</p>
        ) : customTypes.map((type) => (
          <div key={type.id} className="flex min-h-12 items-center gap-3 border-b border-border-light px-3 py-2 last:border-b-0">
            <div className="min-w-0 flex-1">
              {editingId === type.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <>
                  <p className={`truncate text-sm font-medium ${type.is_active ? 'text-text-primary' : 'text-text-muted'}`}>{type.name}</p>
                  <p className="text-xs text-text-muted">{usage.get(type.type_key) ?? 0} local(is) usando este tipo</p>
                </>
              )}
            </div>

            {editingId === type.id ? (
              <div className="flex gap-1">
                <button type="button" onClick={() => saveName(type.id)} disabled={saving} className="rounded-md p-2 text-success hover:bg-success/10" aria-label="Salvar nome"><Check className="h-4 w-4" /></button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-md p-2 text-text-muted hover:bg-bg-tertiary" aria-label="Cancelar edição"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => { setEditingId(type.id); setEditingName(type.name) }} className="rounded-md p-2 text-text-muted hover:bg-bg-tertiary hover:text-text-primary" aria-label={`Editar ${type.name}`}><Pencil className="h-4 w-4" /></button>
                <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => toggleActive(type.id, type.is_active)}>
                  {type.is_active ? 'Desativar' : 'Reativar'}
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted">Desativar impede novos vínculos, mas preserva os locais que já utilizam o tipo.</p>
    </div>
  )
}
