import { useState, useMemo } from 'react'
import { Plus, Search, Building2, Phone, Mail, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { Client } from '../lib/types'

interface ClientFormData {
  name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  address: string
  city: string
  state: string
  notes: string
}

export default function ClientsPage() {
  const { clients, loading, error, createClient, updateClient, deleteClient } = useClients()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    city: '',
    state: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.contact_name?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query) ||
        c.contact_phone?.includes(query)
    )
  }, [clients, searchQuery])

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        contact_name: client.contact_name || '',
        contact_phone: client.contact_phone || '',
        contact_email: client.contact_email || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        notes: client.notes || '',
      })
    } else {
      setEditingClient(null)
      setFormData({
        name: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        address: '',
        city: '',
        state: '',
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const data = {
      ...formData,
      is_active: true,
    }
    const result = editingClient
      ? await updateClient(editingClient.id, data)
      : await createClient(data)
    if (result.error) {
      alert(result.error)
    } else {
      setIsModalOpen(false)
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!deleteClientId) return
    const result = await deleteClient(deleteClientId)
    if (result.error) {
      alert(result.error)
    }
    setDeleteClientId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar cliente por nome, contato, cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-sm"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Lista de clientes */}
      {filteredClients.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={
            searchQuery
              ? 'Tente ajustar os termos da busca'
              : 'Cadastre seu primeiro cliente para começar'
          }
          action={
            !searchQuery && (
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Cliente
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{client.name}</h3>
                    {client.city && (
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {client.city}{client.state && `, ${client.state}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDeleteClientId(client.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(client.contact_name || client.contact_phone || client.contact_email) && (
                <div className="mt-4 pt-4 border-t border-border-light space-y-2">
                  {client.contact_name && (
                    <p className="text-sm text-text-secondary">{client.contact_name}</p>
                  )}
                  {client.contact_phone && (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.contact_phone}
                    </p>
                  )}
                  {client.contact_email && (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.contact_email}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenModal(client)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    localStorage.setItem('selectedClientId', client.id)
                    localStorage.setItem('selectedClientName', client.name)
                    window.location.href = '/'
                  }}
                >
                  Selecionar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Cliente *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome do Contato"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            />
            <Input
              label="Telefone"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          <Input
            label="E-mail"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
          />
          <Input
            label="Endereço"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cidade"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="UF"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
              maxLength={2}
              placeholder="SP"
            />
          </div>
          <Input
            label="Observações"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : editingClient ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dialog de confirmação */}
      <ConfirmDialog
        isOpen={!!deleteClientId}
        onClose={() => setDeleteClientId(null)}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? Todos os equipamentos associados serão removidos."
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  )
}
