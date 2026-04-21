import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Search, Building2, Phone, Mail, MapPin, Pencil, Trash2, Globe, User, Loader2 } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { Client } from '../lib/types'

// ─── Helpers de formatação ───────────────────────────────────────────────────

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function formatCEP(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3')
  }
  return digits.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3')
}

// ─── Lista de UFs ─────────────────────────────────────────────────────────────

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ClientFormData {
  person_type: 'PJ' | 'PF'
  name: string
  cnpj: string
  cpf: string
  contact_name: string
  contact_phone: string
  contact_email: string
  website: string
  zipcode: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  address: string
  notes: string
}

const emptyForm: ClientFormData = {
  person_type: 'PJ',
  name: '',
  cnpj: '',
  cpf: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  zipcode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  address: '',
  notes: '',
}

// ─── Campo genérico estilizado ────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 bg-bg-primary border border-border-light rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors'

// ─── Componente principal ─────────────────────────────────────────────────────

// Sistema de gerenciamento de clientes/projetos
export default function ClientsPage() {
  const { clients, loading, error, createClient, updateClient, deleteClient } = useClients()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Loading states para APIs externas
  const [loadingCNPJ, setLoadingCNPJ] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

  // ─── Busca cidades do estado via IBGE ──────────────────────────────────────

  const fetchCities = useCallback(async (uf: string) => {
    if (!uf || uf.length !== 2) { setCities([]); return }
    setLoadingCities(true)
    try {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
      )
      if (res.ok) {
        const data: { nome: string }[] = await res.json()
        setCities(data.map((m) => m.nome))
      }
    } catch {
      setCities([])
    } finally {
      setLoadingCities(false)
    }
  }, [])

  useEffect(() => {
    fetchCities(formData.state)
  }, [formData.state, fetchCities])

  // ─── Busca CNPJ via ReceitaWS ───────────────────────────────────────────────

  const handleCNPJBlur = async () => {
    const digits = formData.cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setLoadingCNPJ(true)
    try {
      const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`)
      if (res.ok) {
        const d = await res.json()
        const razao = d.razao_social || ''
        const endereco = d.estabelecimento || {}
        const cep = (endereco.cep || '').replace(/\D/g, '')
        const uf = endereco.estado?.sigla || ''
        setFormData((prev) => ({
          ...prev,
          name: prev.name || razao,
          contact_name: prev.contact_name || razao,
          zipcode: cep ? formatCEP(cep) : prev.zipcode,
          street: endereco.logradouro || prev.street,
          number: endereco.numero || prev.number,
          complement: endereco.complemento || prev.complement,
          neighborhood: endereco.bairro || prev.neighborhood,
          city: endereco.cidade?.nome || prev.city,
          state: uf || prev.state,
        }))
        if (uf) fetchCities(uf)
      }
    } catch {
      // silencia - API pode não estar disponível
    } finally {
      setLoadingCNPJ(false)
    }
  }

  // ─── Busca CEP via ViaCEP ───────────────────────────────────────────────────

  const handleCEPBlur = async () => {
    const digits = formData.zipcode.replace(/\D/g, '')
    if (digits.length !== 8) return
    setLoadingCEP(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (res.ok) {
        const d = await res.json()
        if (!d.erro) {
          setFormData((prev) => ({
            ...prev,
            street: d.logradouro || prev.street,
            neighborhood: d.bairro || prev.neighborhood,
            city: d.localidade || prev.city,
            state: d.uf || prev.state,
          }))
          if (d.uf) fetchCities(d.uf)
        }
      }
    } catch {
      // silencia
    } finally {
      setLoadingCEP(false)
    }
  }

  // ─── Modal handlers ────────────────────────────────────────────────────────

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        person_type: client.person_type || 'PJ',
        name: client.name,
        cnpj: client.cnpj || '',
        cpf: client.cpf || '',
        contact_name: client.contact_name || '',
        contact_phone: client.contact_phone || '',
        contact_email: client.contact_email || '',
        website: client.website || '',
        zipcode: client.zipcode || '',
        street: client.street || '',
        number: client.number || '',
        complement: client.complement || '',
        neighborhood: client.neighborhood || '',
        city: client.city || '',
        state: client.state || '',
        address: client.address || '',
        notes: client.notes || '',
      })
      if (client.state) fetchCities(client.state)
    } else {
      setEditingClient(null)
      setFormData(emptyForm)
      setCities([])
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const data = {
      ...formData,
      address: [formData.street, formData.number, formData.complement, formData.neighborhood].filter(Boolean).join(', ') || null,
      cnpj: formData.cnpj || null,
      cpf: formData.cpf || null,
      website: formData.website || null,
      zipcode: formData.zipcode || null,
      street: formData.street || null,
      number: formData.number || null,
      complement: formData.complement || null,
      neighborhood: formData.neighborhood || null,
      is_active: true,
    }
    const result = editingClient
      ? await updateClient(editingClient.id, data)
      : await createClient(data)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      setIsModalOpen(false)
      toast(editingClient ? 'Cliente atualizado com sucesso' : 'Cliente criado com sucesso')
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!deleteClientId) return
    const result = await deleteClient(deleteClientId)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Cliente excluído com sucesso')
    }
    setDeleteClientId(null)
  }

  // ─── Filtro de busca ───────────────────────────────────────────────────────

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients
    const q = searchQuery.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.contact_phone?.includes(q) ||
        c.cnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        c.cpf?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    )
  }, [clients, searchQuery])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ, CPF, cidade..."
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

      {/* Lista */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-16">
          <EmptyState
            message={
              searchQuery
                ? 'Nenhum cliente encontrado. Tente ajustar os termos da busca.'
                : 'Nenhum cliente cadastrado. Cadastre seu primeiro cliente para começar.'
            }
          />
          {!searchQuery && (
            <Button onClick={() => handleOpenModal()} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                    {client.person_type === 'PF'
                      ? <User className="w-5 h-5 text-accent" />
                      : <Building2 className="w-5 h-5 text-accent" />
                    }
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{client.name}</h3>
                    {(client.cnpj || client.cpf) && (
                      <p className="text-xs text-text-muted font-mono">
                        {client.person_type === 'PF' ? client.cpf : client.cnpj}
                      </p>
                    )}
                    {client.city && (
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {client.city}{client.state && `, ${client.state}`}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteClientId(client.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {(client.contact_name || client.contact_phone || client.contact_email || client.website) && (
                <div className="mt-4 pt-4 border-t border-border-light space-y-1.5">
                  {client.contact_name && (
                    <p className="text-sm text-text-secondary truncate">{client.contact_name}</p>
                  )}
                  {client.contact_phone && (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      {client.contact_phone}
                    </p>
                  )}
                  {client.contact_email && (
                    <p className="text-xs text-text-muted flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      {client.contact_email}
                    </p>
                  )}
                  {client.website && (
                    <p className="text-xs text-text-muted flex items-center gap-1 truncate">
                      <Globe className="w-3 h-3 shrink-0" />
                      {client.website}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleOpenModal(client)}>
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

      {/* ─── Modal de cadastro ─────────────────────────────────────────────── */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

          {/* Tipo de pessoa */}
          <div className="flex gap-2">
            {(['PJ', 'PF'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData({ ...formData, person_type: t })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  formData.person_type === t
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-primary text-text-secondary border-border-light hover:border-accent'
                }`}
              >
                {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </button>
            ))}
          </div>

          {/* ── Identificação ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Identificação</p>

            {formData.person_type === 'PJ' ? (
              <Field label="CNPJ" required>
                <div className="relative">
                  <input
                    className={inputClass}
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    onBlur={handleCNPJBlur}
                    placeholder="00.000.000/0000-00"
                  />
                  {loadingCNPJ && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                  )}
                </div>
                {loadingCNPJ && (
                  <p className="text-xs text-accent">Buscando dados do CNPJ...</p>
                )}
              </Field>
            ) : (
              <Field label="CPF" required>
                <input
                  className={inputClass}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                />
              </Field>
            )}

            <Field label="Razão Social / Nome *" required>
              <input
                className={inputClass}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder={formData.person_type === 'PJ' ? 'Razão Social' : 'Nome Completo'}
              />
            </Field>
          </div>

          {/* ── Contato ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Contato</p>
            <Field label="Nome do Contato">
              <input
                className={inputClass}
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Responsável"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                <input
                  className={inputClass}
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: formatPhone(e.target.value) })}
                  placeholder="(11) 99999-9999"
                />
              </Field>
              <Field label="E-mail">
                <input
                  className={inputClass}
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="email@empresa.com"
                />
              </Field>
            </div>
            <Field label="Site / Website">
              <input
                className={inputClass}
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.empresa.com.br"
              />
            </Field>
          </div>

          {/* ── Endereço ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Endereço</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="CEP">
                  <div className="relative">
                    <input
                      className={inputClass}
                      value={formData.zipcode}
                      onChange={(e) => setFormData({ ...formData, zipcode: formatCEP(e.target.value) })}
                      onBlur={handleCEPBlur}
                      placeholder="00000-000"
                    />
                    {loadingCEP && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                    )}
                  </div>
                  {loadingCEP && <p className="text-xs text-accent">Buscando endereço...</p>}
                </Field>
              </div>
              <Field label="UF">
                <select
                  className={inputClass}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                >
                  <option value="">--</option>
                  {STATES.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Logradouro">
              <input
                className={inputClass}
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Rua, Av, Alameda..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Número">
                <input
                  className={inputClass}
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="123"
                />
              </Field>
              <Field label="Complemento">
                <input
                  className={inputClass}
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  placeholder="Sala, Apto..."
                />
              </Field>
            </div>

            <Field label="Bairro">
              <input
                className={inputClass}
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                placeholder="Bairro"
              />
            </Field>

            <Field label="Cidade">
              {loadingCities ? (
                <div className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-sm text-text-muted">Carregando cidades...</span>
                </div>
              ) : cities.length > 0 ? (
                <select
                  className={inputClass}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                >
                  <option value="">Selecione a cidade</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Selecione o estado para listar cidades"
                />
              )}
            </Field>
          </div>

          {/* ── Observações ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Observações</p>
            <Field label="Anotações internas">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas sobre o cliente, projeto ou contrato..."
              />
            </Field>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border-light">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : editingClient ? 'Atualizar' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={!!deleteClientId}
        onClose={() => setDeleteClientId(null)}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? Todos os equipamentos associados serão removidos."
      />
    </div>
  )
}
