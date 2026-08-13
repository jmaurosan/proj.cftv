import { useState, useEffect, useMemo, type FormEvent } from 'react'
import type { Router, InternetConnection, RouterMode } from '../../lib/types'
import { STATUS_OPTIONS, ROUTER_TYPES, ROUTER_MODES, CONNECTION_TYPES_INTERNET, IP_TYPE_OPTIONS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useEquipmentModels } from '../../hooks/useEquipmentModels'
import { findEquipmentModelByText } from '../../lib/equipmentModelCatalog'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import BackupManager from '../ui/BackupManager'
import LabelScanner from '../ui/LabelScanner'
import SiteSelector from '../ui/SiteSelector'
import { applyScannedLabel } from '../../lib/labelScanMerge'
import type { EquipmentLabelData } from '../../services/geminiService'
import { translateError } from '../../lib/errorTranslator'
import { Globe, Package, Plus, Trash2 } from 'lucide-react'

interface RouterFormProps {
  initialData?: Router | null
  clientId?: string | null
  onSubmit: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  onCancel: () => void
}

export default function RouterForm({ initialData, clientId, onSubmit, onCancel }: RouterFormProps) {
  const { user } = useAuth()
  const { models: routerModels, saveModel } = useEquipmentModels('router')

  // Router basic data
  const [name, setName] = useState(initialData?.name ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number ?? '')
  const [installationDate, setInstallationDate] = useState(initialData?.installation_date ?? '')
  const [deviceType, setDeviceType] = useState(initialData?.device_type ?? 'generic')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address ?? '')
  const [username, setUsername] = useState(initialData?.username ?? '')
  const [password, setPassword] = useState(initialData?.password ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'ativo')
  
  // SSID, Senha e Notas
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [notes, setNotes] = useState('')

  // Fase 2: modo, par wireless, site, alimentação PoE
  const [mode, setMode] = useState<RouterMode>((initialData?.mode as RouterMode) ?? 'router')
  const [pairedRouterId, setPairedRouterId] = useState(initialData?.paired_router_id ?? '')
  const [siteId, setSiteId] = useState(initialData?.site_id ?? '')
  const [poweredByPoeInjector, setPoweredByPoeInjector] = useState(initialData?.powered_by_poe_injector ?? false)
  const [otherRouters, setOtherRouters] = useState<Array<{ id: string; name: string; mode: RouterMode }>>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brandOptions = useMemo(() => Array.from(new Set(
    routerModels.map((item) => item.brand).filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, 'pt-BR')), [routerModels])

  const applyRouterModel = (modelId: string) => {
    const selected = routerModels.find((item) => item.id === modelId)
    if (!selected) return
    setBrand(selected.brand)
    setModel(selected.model)
    const deviceTypeMatch = selected.notes?.match(/Tipo:\s*([^|;]+)/i)
    if (deviceTypeMatch?.[1]) setDeviceType(deviceTypeMatch[1].trim())
  }

  const handleModelTextChange = (nextModel: string) => {
    setModel(nextModel)
    const selected = findEquipmentModelByText(routerModels, nextModel, brand)
    if (selected?.id) applyRouterModel(selected.id)
  }

  // Clientes para seleção dinâmica se clientId não for fornecido por prop
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')

  useEffect(() => {
    if (!clientId && !initialData?.client_id && user) {
      supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')
        .then(({ data }) => {
          if (data) setClients(data as { id: string; name: string }[])
        })
    }
  }, [clientId, initialData?.client_id, user])

  // Carrega demais roteadores do mesmo cliente (para seletor de par wireless)
  useEffect(() => {
    const activeClientId = clientId || initialData?.client_id
    if (!activeClientId) { setOtherRouters([]); return }
    supabase
      .from('routers')
      .select('id, name, mode')
      .eq('client_id', activeClientId)
      .order('name')
      .then(({ data }) => setOtherRouters((data as Array<{ id: string; name: string; mode: RouterMode }>) ?? []))
  }, [clientId, initialData?.client_id])

  // Sync basic data when initialData changes
  useEffect(() => {
    setName(initialData?.name ?? '')
    setBrand(initialData?.brand ?? '')
    setModel(initialData?.model ?? '')
    setSerialNumber(initialData?.serial_number ?? '')
    setInstallationDate(initialData?.installation_date ?? '')
    setDeviceType(initialData?.device_type ?? 'generic')
    setLocation(initialData?.location ?? '')
    setIpAddress(initialData?.ip_address ?? '')
    setUsername(initialData?.username ?? '')
    setPassword(initialData?.password ?? '')
    setStatus(initialData?.status ?? 'ativo')
    setMode((initialData?.mode as RouterMode) ?? 'router')
    setPairedRouterId(initialData?.paired_router_id ?? '')
    setSiteId(initialData?.site_id ?? '')
    setPoweredByPoeInjector(initialData?.powered_by_poe_injector ?? false)

    const rawNotes = initialData?.notes ?? ''
    if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(rawNotes)
        setWifiSsid(parsed.wifi_ssid ?? '')
        setWifiPassword(parsed.wifi_password ?? '')
        setNotes(parsed.notes ?? '')
      } catch (e) {
        setWifiSsid('')
        setWifiPassword('')
        setNotes(rawNotes)
      }
    } else {
      setWifiSsid('')
      setWifiPassword('')
      setNotes(rawNotes)
    }
  }, [initialData])

  // Internet connections
  const [internetConnections, setInternetConnections] = useState<InternetConnection[]>([])
  const [showInternetForm, setShowInternetForm] = useState(false)

  // New internet connection form
  const [newConn, setNewConn] = useState({
    operator_name: '',
    connection_type: 'fiber',
    ip_type: 'dynamic',
    ip_address: '',
    subnet_mask: '255.255.255.0',
    gateway_ip: '',
    dhcp_enabled: true,
    contract_number: '',
    notes: '',
  })

  // Load existing internet connections if editing
  useEffect(() => {
    if (initialData?.id) {
      supabase
        .from('internet_connections')
        .select('*')
        .eq('router_id', initialData.id)
        .order('created_at')
        .then(({ data }) => {
          if (data) setInternetConnections(data as InternetConnection[])
        })
    }
  }, [initialData?.id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Serializar SSID e Senha do Wi-Fi no campo notes se algum deles for preenchido
    let finalNotes = notes || null
    if (wifiSsid || wifiPassword) {
      finalNotes = JSON.stringify({
        wifi_ssid: wifiSsid || null,
        wifi_password: wifiPassword || null,
        notes: notes || null
      })
    }

    const result = await onSubmit({
      name,
      brand: brand || null,
      model: model || null,
      serial_number: serialNumber || null,
      installation_date: installationDate || null,
      device_type: deviceType,
      location: location || null,
      ip_address: ipAddress || null,
      username: username || null,
      password: password || null,
      status,
      notes: finalNotes,
      mode,
      paired_router_id: pairedRouterId || null,
      site_id: siteId || null,
      powered_by_poe_injector: poweredByPoeInjector,
      client_id: clientId || initialData?.client_id || selectedClient || null,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Sincronização bidirecional do par wireless.
    // Se este roteador foi vinculado a outro, garante que o outro também aponte de volta.
    // Se o vínculo mudou/foi removido, limpa o antigo par se ele ainda apontava para este.
    if (initialData?.id) {
      const previousPair = initialData?.paired_router_id ?? null
      const nextPair = pairedRouterId || null

      if (previousPair && previousPair !== nextPair) {
        // Desvincula o par antigo se ele ainda aponta para este roteador
        const { error: unlinkErr } = await supabase
          .from('routers')
          .update({ paired_router_id: null })
          .eq('id', previousPair)
          .eq('paired_router_id', initialData.id)
        if (unlinkErr) console.warn('Falha ao desvincular par antigo:', translateError(unlinkErr))
      }

      if (nextPair) {
        const { error: linkErr } = await supabase
          .from('routers')
          .update({ paired_router_id: initialData.id })
          .eq('id', nextPair)
        if (linkErr) console.warn('Falha ao vincular par novo:', translateError(linkErr))
      }
    }

    if (brand && model) {
      await saveModel({
        type: 'router',
        brand,
        model,
        resolution: null,
        channel_count: null,
        poe_standard: null,
        max_ports: null,
        is_poe: false,
        notes: `Tipo: ${deviceType}`,
      })
    }

    setLoading(false)
  }

  const handleAddInternetConnection = async () => {
    if (!newConn.operator_name) {
      setError('Nome da operadora é obrigatório')
      return
    }
    if (!user) return

    setLoading(true)
    setError(null)

    // If router not saved yet, save it first
    if (!initialData?.id) {
      setError('Salve o roteador primeiro antes de adicionar conexões de internet')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('internet_connections')
      .insert({
        router_id: initialData.id,
        operator_name: newConn.operator_name,
        connection_type: newConn.connection_type,
        ip_type: newConn.ip_type,
        ip_address: newConn.ip_address || null,
        subnet_mask: newConn.subnet_mask || null,
        gateway_ip: newConn.gateway_ip || null,
        dhcp_enabled: newConn.dhcp_enabled,
        contract_number: newConn.contract_number || null,
        notes: newConn.notes || null,
        client_id: clientId || null,
        user_id: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      setError('Erro ao adicionar conexão: ' + error.message)
    } else if (data) {
      setInternetConnections((prev) => [...prev, data as InternetConnection])
      // Reset form
      setNewConn({
        operator_name: '',
        connection_type: 'fiber',
        ip_type: 'dynamic',
        ip_address: '',
        subnet_mask: '255.255.255.0',
        gateway_ip: '',
        dhcp_enabled: true,
        contract_number: '',
        notes: '',
      })
      setShowInternetForm(false)
    }

    setLoading(false)
  }

  const handleDeleteInternetConnection = async (id: string) => {
    if (!confirm('Excluir esta conexão de internet?')) return

    const { error } = await supabase.from('internet_connections').delete().eq('id', id)
    if (error) {
      setError('Erro ao excluir: ' + error.message)
    } else {
      setInternetConnections((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <LabelScanner
          equipmentType="router"
          onResult={(scanned: EquipmentLabelData) => {
            applyScannedLabel(scanned, [
              { key: 'brand', label: 'Marca', current: brand, setter: setBrand },
              { key: 'model', label: 'Modelo', current: model, setter: setModel },
              { key: 'serial_number', label: 'Nº de série', current: serialNumber, setter: setSerialNumber },
            ])
          }}
        />
      </div>

      {routerModels.length > 0 && (
        <div className="bg-bg-tertiary/50 border border-border-light rounded-lg p-3">
          <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5" />
            Modelo cadastrado (opcional)
          </label>
          <Select
            value=""
            onChange={(e) => applyRouterModel(e.target.value)}
            options={routerModels.map((item) => ({
              value: item.id,
              label: `${item.brand ? `${item.brand} ` : ''}${item.model}`,
            }))}
            placeholder="Selecione para preencher automaticamente"
          />
        </div>
      )}

      {!clientId && !initialData?.client_id && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Cliente do Roteador"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            options={[
              { value: '', label: 'Selecione um cliente...' },
              ...clients.map((c) => ({ value: c.id, label: c.name }))
            ]}
            required
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome do Roteador"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex: Edge Router Principal"
        />
        <Select
          label="Tipo de Dispositivo"
          value={deviceType}
          onChange={(e) => setDeviceType(e.target.value)}
          options={ROUTER_TYPES}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Marca"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Ex: Ubiquiti, MikroTik, TP-Link"
          list="router-brands"
        />
        <Input
          label="Modelo"
          value={model}
          onChange={(e) => handleModelTextChange(e.target.value)}
          placeholder="Ex: EdgeRouter X, RB750, Archer AX6000"
          list="router-models"
        />
        <datalist id="router-brands">
          {brandOptions.map((item) => <option key={item} value={item} />)}
        </datalist>
        <datalist id="router-models">
          {routerModels.map((item) => <option key={item.id} value={item.model} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="SN / Número de série"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Número de série do equipamento"
        />
        <Input
          label="Data de instalação"
          type="date"
          value={installationDate}
          onChange={(e) => setInstallationDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Localização"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Rack Sala Técnica"
        />
        <Input
          label="Endereço IP"
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
          placeholder="192.168.0.1"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Usuário de Acesso"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
        />
        <Input
          label="Senha de Acesso"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Fase 2: modo do roteador + par wireless + site + PoE */}
      <div className="border border-accent/30 rounded-lg p-4 space-y-4 bg-accent/5">
        <h3 className="text-sm font-semibold text-primary">Função na rede</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Modo do roteador"
            value={mode}
            onChange={(e) => {
              const nextMode = e.target.value as RouterMode
              setMode(nextMode)
              // Se sair de ap/client/bridge, limpa o par
              if (!['ap', 'client', 'bridge'].includes(nextMode)) setPairedRouterId('')
            }}
            options={ROUTER_MODES}
          />

          {['ap', 'client', 'bridge'].includes(mode) && (
            <Select
              label="Roteador par (link wireless)"
              value={pairedRouterId}
              onChange={(e) => setPairedRouterId(e.target.value)}
              options={[
                { value: '', label: '— Sem par vinculado —' },
                ...otherRouters
                  .filter((r) => r.id !== initialData?.id)
                  .map((r) => ({ value: r.id, label: `${r.name}${r.mode && r.mode !== 'router' ? ` (${r.mode})` : ''}` })),
              ]}
            />
          )}
        </div>

        <SiteSelector value={siteId} onChange={setSiteId} />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={poweredByPoeInjector}
            onChange={(e) => setPoweredByPoeInjector(e.target.checked)}
            className="w-4 h-4 rounded border-border-light bg-bg-primary text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-primary">Alimentado por injetor PoE</span>
        </label>
        <p className="text-xs text-text-muted -mt-2 pl-6">
          Comum em roteadores de elevador e links wireless externos.
        </p>
      </div>

      {/* Rede Wi-Fi (Opcional) */}
      <div className="border border-slate-700/60 rounded-lg p-4 space-y-4 bg-slate-800/10">
        <h3 className="text-sm font-semibold text-primary">Rede Wi-Fi (Opcional)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="SSID do Wi-Fi"
            value={wifiSsid}
            onChange={(e) => setWifiSsid(e.target.value)}
            placeholder="Nome da rede sem fio"
          />
          <Input
            label="Senha do Wi-Fi"
            type="password"
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
            placeholder="Senha da rede sem fio"
          />
        </div>
      </div>

      <Input
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas sobre configuração, interfaces, etc."
      />

      {/* Internet Connections Section */}
      <div className="border border-slate-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Conexões de Internet ({internetConnections.length})
          </h3>
          {initialData?.id && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowInternetForm(!showInternetForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>

        {/* List of existing connections */}
        {internetConnections.length > 0 && (
          <div className="space-y-2">
            {internetConnections.map((conn) => (
              <div key={conn.id} className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{conn.operator_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${conn.is_active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {conn.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted mt-1 space-y-0.5">
                      <div>Tipo: {CONNECTION_TYPES_INTERNET.find((t) => t.value === conn.connection_type)?.label ?? conn.connection_type}</div>
                      <div>IP: {conn.ip_type === 'dynamic' ? 'DHCP' : conn.ip_type === 'static' ? 'IP Fixo' : 'IP Público'} - {conn.ip_address || 'N/A'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteInternetConnection(conn.id)}
                    className="text-text-muted hover:text-danger p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form to add new connection */}
        {showInternetForm && (
          <div className="bg-slate-800/70 rounded-lg p-4 space-y-3 border border-border-light">
            <h4 className="text-sm font-medium text-text-primary">Nova Conexão de Internet</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Operadora"
                value={newConn.operator_name}
                onChange={(e) => setNewConn({ ...newConn, operator_name: e.target.value })}
                placeholder="Ex: Vivo, Claro, NET"
                required
              />
              <Select
                label="Tipo de Conexão"
                value={newConn.connection_type}
                onChange={(e) => setNewConn({ ...newConn, connection_type: e.target.value })}
                options={CONNECTION_TYPES_INTERNET}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Tipo de IP"
                value={newConn.ip_type}
                onChange={(e) => setNewConn({ ...newConn, ip_type: e.target.value })}
                options={IP_TYPE_OPTIONS}
              />
              <Input
                label="IP do Gateway/Modem"
                value={newConn.ip_address}
                onChange={(e) => setNewConn({ ...newConn, ip_address: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Máscara de Sub-rede"
                value={newConn.subnet_mask}
                onChange={(e) => setNewConn({ ...newConn, subnet_mask: e.target.value })}
                placeholder="255.255.255.0"
              />
              <Input
                label="Gateway Padrão"
                value={newConn.gateway_ip}
                onChange={(e) => setNewConn({ ...newConn, gateway_ip: e.target.value })}
                placeholder="192.168.1.254"
              />
              <label className="flex items-center gap-2 pt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newConn.dhcp_enabled}
                  onChange={(e) => setNewConn({ ...newConn, dhcp_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-border accent-accent"
                />
                <span className="text-sm text-text-secondary">DHCP Habilitado</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Número do Contrato"
                value={newConn.contract_number}
                onChange={(e) => setNewConn({ ...newConn, contract_number: e.target.value })}
                placeholder="Contrato nº..."
              />
            </div>

            <Input
              label="Observações"
              value={newConn.notes}
              onChange={(e) => setNewConn({ ...newConn, notes: e.target.value })}
              placeholder="Notas sobre esta conexão..."
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowInternetForm(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAddInternetConnection} disabled={loading}>
                {loading ? 'Salvando...' : 'Adicionar Conexão'}
              </Button>
            </div>
          </div>
        )}

        {internetConnections.length === 0 && !showInternetForm && (
          <div className="text-center py-4 text-text-muted text-sm">
            Nenhuma conexão de internet cadastrada.
            {initialData?.id && ' Clique em "Adicionar" para incluir.'}
          </div>
        )}
      </div>

      {/* Backups de Configuração */}
      {initialData?.id && (
        <BackupManager
          clientId={initialData?.client_id ?? null}
          equipmentType="router"
          equipmentId={initialData.id}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
