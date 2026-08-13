import { useMemo, useState } from 'react'
import { Cable, Plus, Search, Zap } from 'lucide-react'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import ClientFilterBanner from '../components/ui/ClientFilterBanner'
import UtpCableForm from '../components/forms/UtpCableForm'
import PowerCableForm from '../components/forms/PowerCableForm'
import { useUtpCables } from '../hooks/useUtpCables'
import { usePowerCables } from '../hooks/usePowerCables'
import { useToast } from '../components/ui/Toast'
import { useClient } from '../contexts/ClientContext'
import { CABLE_TYPES } from '../lib/constants'
import { detectCablePreset, CABLE_PRESETS } from '../lib/cableConfiguration'
import type { UtpCable, PowerCable } from '../lib/types'
import type { PairFunction } from '../lib/balunConfiguration'

type TabId = 'utp' | 'power'

const cableTypeLabel = (value: string) =>
  CABLE_TYPES.find((c) => c.value === value)?.label ?? value

export default function CablesPage() {
  const { selectedClientName } = useClient()
  const { toast } = useToast()

  const utp = useUtpCables()
  const power = usePowerCables()

  const [tab, setTab] = useState<TabId>('utp')
  const [search, setSearch] = useState('')
  const [editingUtpId, setEditingUtpId] = useState<string | null>(null)
  const [editingPowerId, setEditingPowerId] = useState<string | null>(null)
  const [creating, setCreating] = useState<TabId | null>(null)

  const filteredUtp = useMemo(() => {
    if (!search.trim()) return utp.data
    const needle = search.trim().toLocaleLowerCase('pt-BR')
    return utp.data.filter((cable) => {
      const haystack = `${cable.name ?? ''} ${cable.cable_type} ${cable.notes ?? ''}`
      return haystack.toLocaleLowerCase('pt-BR').includes(needle)
    })
  }, [utp.data, search])

  const filteredPower = useMemo(() => {
    if (!search.trim()) return power.data
    const needle = search.trim().toLocaleLowerCase('pt-BR')
    return power.data.filter((cable) => {
      const haystack = `${cable.name} ${cable.voltage ?? ''} ${cable.power_source_info ?? ''}`
      return haystack.toLocaleLowerCase('pt-BR').includes(needle)
    })
  }, [power.data, search])

  const utpColumns: Column<UtpCable>[] = [
    {
      key: 'name',
      label: 'Nome',
      sortable: false,
      render: (cable) => cable.name ?? <span className="text-text-muted italic">Sem nome</span>,
    },
    {
      key: 'preset',
      label: 'Configuração',
      render: (cable) => {
        const functions = [1, 2, 3, 4]
          .map((n) => cable.utp_cable_pairs?.find((p) => p.pair_number === n)?.function ?? 'nao_utilizado')
          .map((fn) => fn as PairFunction)
        const preset = detectCablePreset(functions)
        return <span className="text-xs">{CABLE_PRESETS[preset].label}</span>
      },
    },
    {
      key: 'cable_type',
      label: 'Tipo',
      render: (cable) => cableTypeLabel(cable.cable_type),
    },
    {
      key: 'cameras',
      label: 'Câmeras',
      render: (cable) => {
        const videoPairs = cable.utp_cable_pairs?.filter((p) => p.function === 'video') ?? []
        const withCam = videoPairs.filter((p) => p.camera_id).length
        return (
          <span className="text-xs">
            {withCam}/{videoPairs.length || '-'} par(es) de vídeo
          </span>
        )
      },
    },
    {
      key: 'cable_length_meters',
      label: 'Comprimento',
      sortable: true,
      render: (cable) => (cable.cable_length_meters ? `${cable.cable_length_meters} m` : '-'),
    },
  ]

  const powerColumns: Column<PowerCable>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    {
      key: 'wire_gauge_mm2',
      label: 'Bitola',
      render: (cable) => (cable.wire_gauge_mm2 ? `${cable.wire_gauge_mm2.toString().replace('.', ',')} mm²` : '-'),
    },
    { key: 'voltage', label: 'Tensão', render: (cable) => cable.voltage ?? '-' },
    {
      key: 'cable_length_meters',
      label: 'Comprimento',
      render: (cable) => (cable.cable_length_meters ? `${cable.cable_length_meters} m` : '-'),
    },
    {
      key: 'cameras',
      label: 'Câmeras',
      render: (cable) => (
        <span className="text-xs">{cable.camera_ids?.length ?? 0} alimentada(s)</span>
      ),
    },
    {
      key: 'power_source_info',
      label: 'Fonte',
      render: (cable) => cable.power_source_info ?? '-',
    },
  ]

  const handleUtpDelete = async (cable: UtpCable) => {
    if (!window.confirm(`Remover cabo "${cable.name ?? cable.cable_type}"?`)) return
    const result = await utp.remove(cable.id)
    if (result.error) toast(result.error, 'error')
    else toast('Cabo removido')
  }

  const handlePowerDelete = async (cable: PowerCable) => {
    if (!window.confirm(`Remover cabo de alimentação "${cable.name}"?`)) return
    const result = await power.remove(cable.id)
    if (result.error) toast(result.error, 'error')
    else toast('Cabo removido')
  }

  const loading = tab === 'utp' ? utp.loading : power.loading

  return (
    <div className="space-y-4">
      <ClientFilterBanner />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Cable className="w-7 h-7 text-primary" />
            Cabos
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Cabos UTP compartilhados e cabos paralelos de alimentação
          </p>
        </div>
        <Button onClick={() => setCreating(tab)}>
          <Plus className="w-4 h-4 mr-2" />
          {tab === 'utp' ? 'Novo cabo UTP' : 'Novo cabo de alimentação'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('utp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'utp'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Cable className="w-4 h-4" />
          UTP
          <span className={`text-xs ml-1 ${tab === 'utp' ? 'opacity-80' : 'opacity-60'}`}>
            {utp.data.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('power')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'power'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Zap className="w-4 h-4" />
          Alimentação paralela
          <span className={`text-xs ml-1 ${tab === 'power' ? 'opacity-80' : 'opacity-60'}`}>
            {power.data.length}
          </span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={tab === 'utp' ? 'Buscar cabos UTP...' : 'Buscar cabos de alimentação...'}
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
      ) : tab === 'utp' ? (
        filteredUtp.length === 0 ? (
          <EmptyState
            icon={<Cable className="w-10 h-10 text-text-muted" />}
            title="Nenhum cabo UTP cadastrado"
            description="Cadastre cabos aqui ou pelo formulário de cabeamento de cada câmera."
          />
        ) : (
          <DataTable
            columns={utpColumns}
            data={filteredUtp}
            onEdit={(cable) => setEditingUtpId(cable.id)}
            onDelete={handleUtpDelete}
            onRowClick={(cable) => setEditingUtpId(cable.id)}
          />
        )
      ) : filteredPower.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-10 h-10 text-text-muted" />}
          title="Nenhum cabo de alimentação paralelo"
          description="Cadastre um cabo para representar a alimentação externa compartilhada por várias câmeras."
        />
      ) : (
        <DataTable
          columns={powerColumns}
          data={filteredPower}
          onEdit={(cable) => setEditingPowerId(cable.id)}
          onDelete={handlePowerDelete}
          onRowClick={(cable) => setEditingPowerId(cable.id)}
        />
      )}

      {/* Edit UTP */}
      <Modal
        open={!!editingUtpId}
        onClose={() => setEditingUtpId(null)}
        title="Editar cabo UTP"
        size="lg"
      >
        {editingUtpId && (
          <UtpCableForm
            cableId={editingUtpId}
            onClose={() => setEditingUtpId(null)}
            onSaved={() => toast('Cabo UTP salvo com sucesso')}
          />
        )}
      </Modal>

      {/* New UTP */}
      <Modal
        open={creating === 'utp'}
        onClose={() => setCreating(null)}
        title="Novo cabo UTP"
        size="lg"
      >
        <UtpCableForm
          onClose={() => setCreating(null)}
          onSaved={() => toast('Cabo UTP criado com sucesso')}
        />
      </Modal>

      {/* Edit Power */}
      <Modal
        open={!!editingPowerId}
        onClose={() => setEditingPowerId(null)}
        title="Editar cabo de alimentação"
        size="lg"
      >
        {editingPowerId && (
          <PowerCableForm
            powerCableId={editingPowerId}
            onClose={() => setEditingPowerId(null)}
            onSaved={() => toast('Cabo de alimentação salvo com sucesso')}
          />
        )}
      </Modal>

      {/* New Power */}
      <Modal
        open={creating === 'power'}
        onClose={() => setCreating(null)}
        title="Novo cabo de alimentação"
        size="lg"
      >
        <PowerCableForm
          onClose={() => setCreating(null)}
          onSaved={() => toast('Cabo de alimentação criado com sucesso')}
        />
      </Modal>
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border-light rounded-lg">
      <div className="mb-3 opacity-60">{icon}</div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-muted mt-1 max-w-sm">{description}</p>
    </div>
  )
}
