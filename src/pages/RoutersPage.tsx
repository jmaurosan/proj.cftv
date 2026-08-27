import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Router, Client } from '../lib/types'
import { useClient } from '../contexts/ClientContext'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import RouterForm from '../components/forms/RouterForm'
import Button from '../components/ui/Button'
import { Wifi, Search, Plus } from 'lucide-react'
import { STATUS_COLORS } from '../lib/constants'
import { useToast } from '../components/ui/Toast'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import { requireCompatibleSchema } from '../lib/schemaCompatibility'
import { translateError } from '../lib/errorTranslator'

export default function RoutersPage() {
  const { user } = useAuth()
  const { selectedClientId, selectedClientName } = useClient()
  const { toast } = useToast()
  const [routers, setRouters] = useState<Router[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof Router>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingRouter, setEditingRouter] = useState<Router | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    if (!selectedClientId) {
      setRouters([])
      supabase.from('clients').select('id, name').eq('user_id', user.id).order('name').then(({ data }) => {
        setClients((data as Client[]) || [])
        setLoading(false)
      })
      return
    }
    Promise.all([
      supabase.from('routers').select('*').eq('user_id', user.id).eq('client_id', selectedClientId).order('name'),
      supabase.from('clients').select('id, name').eq('user_id', user.id).order('name'),
    ]).then(([routersRes, clientsRes]) => {
      setRouters((routersRes.data as Router[]) || [])
      setClients((clientsRes.data as Client[]) || [])
      setLoading(false)
    })
  }, [user, selectedClientId])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key as keyof Router)
      setSortDir('asc')
    }
  }

  const filteredRouters = useMemo(() => {
    let data = [...routers]

    // Filter by search
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.brand?.toLowerCase().includes(s) ||
          r.model?.toLowerCase().includes(s) ||
          r.location?.toLowerCase().includes(s)
      )
    }

    // Sort
    data.sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })

    return data
  }, [routers, search, sortKey, sortDir])

  const getClientName = (clientId: string | null) => {
    if (!clientId) return '-'
    return clients.find((c) => c.id === clientId)?.name || clientId
  }

  const getDeviceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      edge_router: 'Edge Router',
      mikrotik: 'MikroTik',
      load_balancer: 'Load Balancer',
      generic: 'Genérico',
    }
    return labels[type] || type
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId && !editingRouter) return { error: 'Selecione um cliente antes de cadastrar roteador' }
    const schemaError = await requireCompatibleSchema()
    if (schemaError) {
      toast(schemaError.message, 'error')
      return { error: schemaError.message }
    }

    if (editingRouter) {
      const { error } = await supabase.from('routers').update(data).eq('id', editingRouter.id)
      if (error) {
        const message = translateError(error)
        toast(message, 'error')
        return { error: message }
      }
      setRouters((prev) => prev.map((r) => (r.id === editingRouter.id ? { ...r, ...data } as Router : r)))
      toast('Roteador atualizado com sucesso')
    } else {
      const { data: newRouter, error } = await supabase.from('routers').insert({ ...data, user_id: user.id, client_id: selectedClientId }).select().single()
      if (error) {
        const message = translateError(error)
        toast(message, 'error')
        return { error: message }
      }
      setRouters((prev) => [...prev, newRouter as Router])
      toast('Roteador criado com sucesso')
    }

    setShowForm(false)
    setEditingRouter(null)
    return { error: null }
  }

  const handleDelete = async (router: Router) => {
    if (!confirm(`Excluir roteador "${router.name}"?`)) return
    const schemaError = await requireCompatibleSchema()
    if (schemaError) {
      toast(schemaError.message, 'error')
      return
    }
    const { error } = await supabase.from('routers').delete().eq('id', router.id)
    if (error) {
      toast('Erro ao excluir: ' + error.message, 'error')
    } else {
      setRouters((prev) => prev.filter((r) => r.id !== router.id))
      toast('Roteador excluído com sucesso')
    }
  }

  const columns = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'device_type', label: 'Tipo', sortable: true, render: (r: Router) => getDeviceTypeLabel(r.device_type) },
    { key: 'brand', label: 'Marca', sortable: true },
    { key: 'model', label: 'Modelo', sortable: true },
    { key: 'location', label: 'Localização', sortable: true },
    { key: 'ip_address', label: 'IP', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r: Router) => (
        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || 'bg-gray-500/20 text-gray-400'}`}>
          {r.status === 'ativo' ? 'Ativo' : r.status === 'inativo' ? 'Inativo' : 'Manutenção'}
        </span>
      ),
    },
    { key: 'client_id', label: 'Cliente', sortable: true, render: (r: Router) => getClientName(r.client_id) },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ClientFilterBanner />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Wifi className="w-7 h-7 text-primary" />
            Roteadores e Rede
          </h1>
          <p className="text-sm text-text-muted mt-1">Gerencie roteadores, conexões de internet e segmentos de rede</p>
        </div>
        <Button onClick={() => { setEditingRouter(null); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Roteador
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar roteadores..."
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

      <DataTable
        columns={columns}
        data={filteredRouters}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onEdit={(r) => { setEditingRouter(r); setShowForm(true) }}
        onDelete={handleDelete}
        onRowClick={(r) => { setEditingRouter(r); setShowForm(true) }}
      />

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingRouter(null) }} title={editingRouter ? 'Editar Roteador' : 'Novo Roteador'} size="lg">
        <RouterForm
          initialData={editingRouter}
          clientId={selectedClientId}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingRouter(null) }}
        />
      </Modal>
    </div>
  )
}
