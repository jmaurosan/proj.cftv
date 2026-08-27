import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Plus, Search, ChevronRight, ChevronDown, Building2, Tags } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import SiteForm from '../components/forms/SiteForm'
import SiteTypesManager from '../components/forms/SiteTypesManager'
import { useSites } from '../hooks/useSites'
import { useSiteTypes } from '../hooks/useSiteTypes'
import { useClient } from '../contexts/ClientContext'
import { supabase } from '../lib/supabase'
import type { InstallationSite } from '../lib/types'

interface TreeNode {
  site: InstallationSite
  children: TreeNode[]
}

/** Monta árvore. Sites com parent_site_id inválido caem na raiz. */
function buildTree(sites: InstallationSite[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  sites.forEach((s) => byId.set(s.id, { site: s, children: [] }))
  const roots: TreeNode[] = []
  for (const node of byId.values()) {
    const parentId = node.site.parent_site_id
    if (parentId && byId.has(parentId)) byId.get(parentId)!.children.push(node)
    else roots.push(node)
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.site.name.localeCompare(b.site.name, 'pt-BR'))
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

/** Conta câmeras + roteadores vinculados a um site */
interface UsageStat {
  cameras: number
  routers: number
}

export default function SitesPage() {
  const { selectedClientId, selectedClientName } = useClient()
  const { data: sites, loading, refetch } = useSites()
  const { options: siteTypes } = useSiteTypes()

  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [managingTypes, setManagingTypes] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [usage, setUsage] = useState<Record<string, UsageStat>>({})
  const siteTypeLabel = useCallback(
    (type: string) => siteTypes.find((item) => item.value === type)?.label ?? type,
    [siteTypes],
  )

  // Carrega contagem de câmeras/roteadores por site
  useEffect(() => {
    if (!selectedClientId || sites.length === 0) {
      setUsage({})
      return
    }
    Promise.all([
      supabase.from('cameras').select('site_id').eq('client_id', selectedClientId),
      supabase.from('routers').select('site_id').eq('client_id', selectedClientId),
    ]).then(([camRes, routerRes]) => {
      const next: Record<string, UsageStat> = {}
      sites.forEach((s) => { next[s.id] = { cameras: 0, routers: 0 } })
      ;(camRes.data ?? []).forEach((c: { site_id: string | null }) => {
        if (c.site_id && next[c.site_id]) next[c.site_id].cameras += 1
      })
      ;(routerRes.data ?? []).forEach((r: { site_id: string | null }) => {
        if (r.site_id && next[r.site_id]) next[r.site_id].routers += 1
      })
      setUsage(next)
    })
  }, [selectedClientId, sites])

  const tree = useMemo(() => buildTree(sites), [sites])

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree
    const needle = search.trim().toLocaleLowerCase('pt-BR')
    // Mantém um nó se ele bate OU se algum descendente bate
    const filterNode = (node: TreeNode): TreeNode | null => {
      const kids = node.children.map(filterNode).filter(Boolean) as TreeNode[]
      const matches = node.site.name.toLocaleLowerCase('pt-BR').includes(needle)
        || siteTypeLabel(node.site.site_type).toLocaleLowerCase('pt-BR').includes(needle)
      if (matches || kids.length > 0) return { ...node, children: kids }
      return null
    }
    return tree.map(filterNode).filter(Boolean) as TreeNode[]
  }, [tree, search, siteTypeLabel])

  const toggleExpand = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <ClientFilterBanner />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <MapPin className="w-7 h-7 text-primary" />
            Locais (Sites)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Elevadores, blocos, guarita e outros locais físicos para organizar câmeras e roteadores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setManagingTypes(true)}>
            <Tags className="w-4 h-4" /> Tipos de local
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Novo site
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar sites por nome ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {selectedClientName && (
          <div className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary">
            Cliente: <span className="text-text-primary font-medium">{selectedClientName}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredTree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border-light rounded-lg">
          <Building2 className="w-10 h-10 text-text-muted mb-3 opacity-60" />
          <p className="text-sm font-medium text-text-primary">Nenhum site cadastrado</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm">
            Cadastre elevadores, blocos, guarita ou qualquer local físico para agrupar câmeras e roteadores na topologia.
          </p>
        </div>
      ) : (
        <div className="border border-border-light rounded-lg overflow-hidden bg-bg-secondary">
          {filteredTree.map((node) => (
            <SiteRow
              key={node.site.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggleExpand}
              onEdit={setEditingId}
              usage={usage}
              siteTypeLabel={siteTypeLabel}
            />
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo site" size="md">
        <SiteForm onClose={() => setCreating(false)} onSaved={refetch} />
      </Modal>

      <Modal open={managingTypes} onClose={() => setManagingTypes(false)} title="Tipos de local" size="lg">
        <SiteTypesManager sites={sites} />
      </Modal>

      <Modal open={!!editingId} onClose={() => setEditingId(null)} title="Editar site" size="md">
        {editingId && (
          <SiteForm siteId={editingId} onClose={() => setEditingId(null)} onSaved={refetch} />
        )}
      </Modal>
    </div>
  )
}

interface SiteRowProps {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  usage: Record<string, UsageStat>
  siteTypeLabel: (type: string) => string
}

function SiteRow({ node, depth, expanded, onToggle, onEdit, usage, siteTypeLabel }: SiteRowProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.site.id)
  const stat = usage[node.site.id] ?? { cameras: 0, routers: 0 }

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-border-light hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onEdit(node.site.id)}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.site.id) }}
          className={`w-5 h-5 shrink-0 flex items-center justify-center rounded ${hasChildren ? 'hover:bg-bg-tertiary text-text-muted' : 'opacity-0 pointer-events-none'}`}
          aria-label={isExpanded ? 'Recolher' : 'Expandir'}
        >
          {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-text-primary truncate">{node.site.name}</span>
            <span className="text-xs text-text-muted">{siteTypeLabel(node.site.site_type)}</span>
          </div>
          {node.site.notes && (
            <p className="text-xs text-text-muted truncate mt-0.5">{node.site.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted shrink-0">
          <span>{stat.cameras} câm.</span>
          <span>{stat.routers} rot.</span>
        </div>
      </div>
      {hasChildren && isExpanded && node.children.map((child) => (
        <SiteRow
          key={child.site.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          usage={usage}
          siteTypeLabel={siteTypeLabel}
        />
      ))}
    </>
  )
}
