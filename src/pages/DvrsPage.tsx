import { useState, useMemo } from 'react'
import { Plus, Search, X, HardDrive, Pencil, Trash2 } from 'lucide-react'
import { useDvrs } from '../hooks/useDvrs'
import type { Dvr } from '../lib/types'
import DataTable, { type Column } from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import DvrForm from '../components/forms/DvrForm'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import { byDirection, compareIpAddress, compareNumbers, naturalCompare } from '../lib/sorting'

const normalizeSearch = (value: unknown) =>
  String(value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export default function DvrsPage() {
  const { data, loading, create, update, remove } = useDvrs()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Dvr | null>(null)
  const [deleting, setDeleting] = useState<Dvr | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      const aData = a as unknown as Record<string, unknown>
      const bData = b as unknown as Record<string, unknown>

      if (sortKey === 'ip_address') {
        return byDirection(compareIpAddress(aData.ip_address, bData.ip_address), sortDir) || naturalCompare(a.name, b.name)
      } else if (sortKey === 'total_channels') {
        return byDirection(compareNumbers(aData.total_channels, bData.total_channels), sortDir) || naturalCompare(a.name, b.name)
      } else {
        aVal = aData[sortKey]?.toString() || ''
        bVal = bData[sortKey]?.toString() || ''
      }

      return byDirection(naturalCompare(aVal, bVal), sortDir)
    })
  }, [data, sortKey, sortDir])

  const filteredData = useMemo(() => {
    const query = normalizeSearch(searchQuery.trim())
    if (!query) return sortedData

    return sortedData.filter((dvr) => {
      const searchable = [
        dvr.name,
        dvr.ip_address,
        dvr.model,
        dvr.brand,
        dvr.location,
        dvr.serial_number,
        dvr.total_channels,
      ]
      return searchable.some((value) => normalizeSearch(value).includes(query))
    })
  }, [sortedData, searchQuery])

  const columns: Column<Dvr>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'ip_address', label: 'IP', sortable: true },
    { key: 'model', label: 'Modelo', sortable: true },
    { key: 'location', label: 'Localização', sortable: true },
    { key: 'total_channels', label: 'Canais', sortable: true, render: (d) => `${d.total_channels} ch` },
    {
      key: 'hd_capacity_tb',
      label: 'HD',
      sortable: true,
      render: (d) => d.hd_capacity_tb ? `${d.hd_capacity_tb} TB${d.hd_brand ? ` · ${d.hd_brand}` : ''}` : 'Sem HD',
    },
    { key: 'status', label: 'Status', sortable: true, render: (d) => <Badge status={d.status} /> },
  ]

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, formData)
      if (!result.error) {
        setModalOpen(false)
        setEditing(null)
        toast('DVR atualizado com sucesso')
      }
      return result
    }
    const result = await create(formData as Parameters<typeof create>[0])
    if (!result.error) {
      setModalOpen(false)
      toast('DVR criado com sucesso')
    }
    return result
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const result = await remove(deleting.id)
    if (!result.error) {
      toast('DVR excluído com sucesso')
    } else {
      toast(result.error, 'error')
    }
    setDeleteLoading(false)
    setDeleting(null)
  }

  const openDvr = (dvr: Dvr) => {
    setEditing(dvr)
    setModalOpen(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <ClientFilterBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">DVRs</h2>
          <p className="text-text-muted text-sm mt-1">
            {searchQuery ? `${filteredData.length} de ${data.length} registro(s)` : `${data.length} registro(s)`}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Novo DVR
        </Button>
      </div>

      <div className="rounded-xl border border-border-light bg-bg-secondary p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar DVR por nome, IP, modelo ou localização..."
            className="w-full rounded-lg border border-border-light bg-bg-primary py-2.5 pl-9 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
              title="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="md:hidden sticky top-0 z-20 -mx-4 border-y border-border-light bg-bg-primary/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/80">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Abrir DVR</span>
            <span className="text-[11px] text-text-muted">{filteredData.length} DVR(s)</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredData.map((dvr) => (
              <button
                key={`dvr-shortcut-${dvr.id}`}
                type="button"
                onClick={() => openDvr(dvr)}
                className="shrink-0 rounded-lg border border-border-light bg-bg-secondary px-3 py-2 text-left transition-colors hover:border-accent hover:text-accent"
                title={`Abrir ${dvr.name}`}
              >
                <span className="block max-w-28 truncate text-xs font-bold text-accent">{dvr.name}</span>
                <span className="block text-[11px] text-text-muted">{dvr.total_channels} canais</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {filteredData.length === 0 ? (
          <div className="rounded-xl border border-border-light bg-bg-secondary p-6 text-center text-sm text-text-muted">
            Nenhum registro encontrado
          </div>
        ) : (
          filteredData.map((dvr) => {
            const hdLabel = dvr.hd_capacity_tb
              ? `${dvr.hd_capacity_tb} TB${dvr.hd_brand ? ` · ${dvr.hd_brand}` : ''}`
              : 'Sem HD'

            return (
              <div key={`mobile-dvr-${dvr.id}`} className="rounded-xl border border-border-light bg-bg-secondary p-3">
                <button type="button" onClick={() => openDvr(dvr)} className="w-full text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
                      <span className="text-[10px] font-semibold uppercase text-accent/80">Canais</span>
                      <span className="text-lg font-bold leading-none text-accent">{dvr.total_channels}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-text-primary">{dvr.name}</h3>
                          <p className="mt-0.5 truncate text-xs text-text-muted">{dvr.location || 'Sem localização'}</p>
                        </div>
                        <Badge status={dvr.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {dvr.brand && (
                          <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-blue-500/15 text-blue-300">
                            {dvr.brand}
                          </span>
                        )}
                        {dvr.model && (
                          <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-violet-500/15 text-violet-300">
                            {dvr.model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-bg-primary px-3 py-2">
                      <span className="block text-text-muted">IP</span>
                      <span className="mt-0.5 block truncate font-medium text-text-primary">{dvr.ip_address || '-'}</span>
                    </div>
                    <div className="rounded-lg bg-bg-primary px-3 py-2">
                      <span className="block text-text-muted">HD</span>
                      <span className="mt-0.5 block truncate font-medium text-text-primary">{hdLabel}</span>
                    </div>
                  </div>
                </button>

                <div className="mt-3 flex items-center justify-between border-t border-border-light pt-2">
                  <div className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <HardDrive className="h-4 w-4" />
                    <span>{dvr.serial_number || 'Sem serial'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openDvr(dvr)}
                      className="p-2 rounded-lg text-text-muted hover:bg-accent/10 hover:text-accent transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(dvr)}
                      className="p-2 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden bg-bg-secondary border border-border-light rounded-xl overflow-hidden md:block">
        <DataTable
          columns={columns}
          data={filteredData}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={(item) => openDvr(item)}
          onDelete={(item) => setDeleting(item)}
          onRowClick={(item) => openDvr(item)}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar DVR' : 'Novo DVR'}
        size="lg"
      >
        <DvrForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir DVR"
        message={`Tem certeza que deseja excluir o DVR "${deleting?.name}"? Esta ação não pode ser desfeita.`}
        loading={deleteLoading}
      />
    </div>
  )
}
