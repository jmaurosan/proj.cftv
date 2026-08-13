import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import {
  CABLE_TYPES,
  WIRING_STANDARDS,
  PAIR_FUNCTIONS,
  DEFAULT_PAIR_COLORS,
  WIRE_COLORS,
} from '../../lib/constants'
import {
  CABLE_PRESETS,
  applyCablePreset,
  detectCablePreset,
  type CablePresetId,
} from '../../lib/cableConfiguration'
import type { PairFunction } from '../../lib/balunConfiguration'
import { useUtpCables } from '../../hooks/useUtpCables'
import { useClient } from '../../contexts/ClientContext'
import type { Camera, UtpCable, UtpCablePairInput } from '../../lib/types'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface UtpCableFormProps {
  anchorCameraId?: string
  cableId?: string
  onClose: () => void
  onSaved?: () => void
}

const isUtp = (type: string) => type.startsWith('utp_')

const PRESET_OPTIONS = (Object.values(CABLE_PRESETS) as Array<(typeof CABLE_PRESETS)[CablePresetId]>).map((preset) => ({
  value: preset.id,
  label: preset.label,
}))

const PIN_ORDERS: Record<string, string[]> = {
  T568A: ['Branco-Verde', 'Verde', 'Branco-Laranja', 'Azul', 'Branco-Azul', 'Laranja', 'Branco-Marrom', 'Marrom'],
  T568B: ['Branco-Laranja', 'Laranja', 'Branco-Verde', 'Azul', 'Branco-Azul', 'Verde', 'Branco-Marrom', 'Marrom'],
  sequencial: ['Azul', 'Branco-Azul', 'Laranja', 'Branco-Laranja', 'Verde', 'Branco-Verde', 'Marrom', 'Branco-Marrom'],
}

const WIRE_HEX: Record<string, string> = {
  Azul: '#2563eb',
  Laranja: '#f97316',
  Verde: '#16a34a',
  Marrom: '#7c3f16',
}

const splitColors = (pair: string): [string, string] => {
  const parts = pair.split(' / ')
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? '']
}

const parseStoredStandards = (value: string | null) => {
  const stored = value || 'T568B'
  if (stored.includes('->')) {
    const [camera, equipment] = stored.split('->')
    return { camera: camera || 'T568B', equipment: equipment || 'T568B' }
  }
  return { camera: stored, equipment: stored }
}

interface PairState {
  function: PairFunction
  wire1: string
  wire2: string
  cameraId: string | null
}

const buildDefaultPairs = (standard: string): PairState[] => {
  const colors = DEFAULT_PAIR_COLORS[standard] ?? DEFAULT_PAIR_COLORS.T568B
  return [0, 1, 2, 3].map((index) => {
    const [w1, w2] = splitColors(colors[index] ?? '')
    return { function: 'nao_utilizado' as PairFunction, wire1: w1, wire2: w2, cameraId: null }
  })
}

function CrimpPreview({ title, standard, customOrder }: { title: string; standard: string; customOrder: string[] }) {
  const order = standard === 'personalizado' ? customOrder : PIN_ORDERS[standard] || PIN_ORDERS.T568B
  return (
    <div className="rounded-lg border border-border-light bg-bg-primary/70 p-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-semibold text-text-primary">{title}</p>
          <p className="text-[9px] text-text-muted">Contatos para cima · pino 1 à esquerda</p>
        </div>
        <span className="text-[10px] font-mono text-accent">{standard}</span>
      </div>
      <div className="grid grid-cols-8 gap-1 rounded-md border border-border-light bg-slate-900/70 p-2">
        {order.map((wire, index) => {
          const isWhite = wire.startsWith('Branco-')
          const base = wire.replace('Branco-', '')
          const color = WIRE_HEX[base] || '#64748b'
          return (
            <div key={`${wire}-${index}`} className="min-w-0 text-center">
              <span className="block text-[8px] font-mono text-slate-300 mb-1">{index + 1}</span>
              <span
                className="block h-12 rounded-sm border border-white/20"
                style={{
                  background: isWhite
                    ? `repeating-linear-gradient(135deg, #f8fafc 0 5px, ${color} 5px 8px)`
                    : color,
                }}
                title={`${index + 1}: ${wire}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function UtpCableForm({ anchorCameraId, cableId, onClose, onSaved }: UtpCableFormProps) {
  const { selectedClientId } = useClient()
  const { data: cables, loading: loadingCables, create, update, remove } = useUtpCables()

  // Cable-level fields
  const [name, setName] = useState('')
  const [cableType, setCableType] = useState('utp_cat5')
  const [cameraEndStandard, setCameraEndStandard] = useState('T568B')
  const [equipmentEndStandard, setEquipmentEndStandard] = useState('T568B')
  const [customColorOrder, setCustomColorOrder] = useState('')
  const [cableLengthMeters, setCableLengthMeters] = useState('')
  const [hasSplice, setHasSplice] = useState(false)
  const [spliceLocation, setSpliceLocation] = useState('')
  const [spliceNotes, setSpliceNotes] = useState('')
  const [notes, setNotes] = useState('')

  const [pairs, setPairs] = useState<PairState[]>(() => buildDefaultPairs('T568B'))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [availableCameras, setAvailableCameras] = useState<Camera[]>([])
  const [loadedCableId, setLoadedCableId] = useState<string | null>(null)

  // Load client's cameras
  useEffect(() => {
    if (!selectedClientId) {
      setAvailableCameras([])
      return
    }
    supabase
      .from('cameras')
      .select('id, name, location, connection_type, client_id')
      .eq('client_id', selectedClientId)
      .order('name')
      .then(({ data }) => setAvailableCameras((data as Camera[]) ?? []))
  }, [selectedClientId])

  // Find the cable to load (by explicit cableId OR by anchor camera)
  const targetCable: UtpCable | null = useMemo(() => {
    if (loadingCables) return null
    if (cableId) return cables.find((c) => c.id === cableId) ?? null
    if (anchorCameraId) {
      return cables.find((c) => c.utp_cable_pairs?.some((p) => p.camera_id === anchorCameraId)) ?? null
    }
    return null
  }, [cables, cableId, anchorCameraId, loadingCables])

  // Populate form from loaded cable
  useEffect(() => {
    if (!targetCable || loadedCableId === targetCable.id) return
    setLoadedCableId(targetCable.id)
    setName(targetCable.name ?? '')
    setCableType(targetCable.cable_type)
    const standards = parseStoredStandards(targetCable.wiring_standard)
    setCameraEndStandard(standards.camera)
    setEquipmentEndStandard(standards.equipment)
    setCustomColorOrder(targetCable.custom_color_order ?? '')
    setCableLengthMeters(targetCable.cable_length_meters?.toString() ?? '')
    setHasSplice(targetCable.has_splice)
    setSpliceLocation(targetCable.splice_location ?? '')
    setSpliceNotes(targetCable.splice_notes ?? '')
    setNotes(targetCable.notes ?? '')

    const sortedPairs = [...(targetCable.utp_cable_pairs ?? [])].sort((a, b) => a.pair_number - b.pair_number)
    const nextPairs: PairState[] = [0, 1, 2, 3].map((index) => {
      const existing = sortedPairs[index]
      if (existing) {
        return {
          function: (existing.function as PairFunction) ?? 'nao_utilizado',
          wire1: existing.wire1_color ?? '',
          wire2: existing.wire2_color ?? '',
          cameraId: existing.camera_id,
        }
      }
      return { function: 'nao_utilizado' as PairFunction, wire1: '', wire2: '', cameraId: null }
    })
    setPairs(nextPairs)
  }, [targetCable, loadedCableId])

  const currentPreset = useMemo<CablePresetId>(
    () => detectCablePreset(pairs.map((p) => p.function)),
    [pairs],
  )

  const handleCameraStandardChange = (standard: string) => {
    setCameraEndStandard(standard)
    const colors = DEFAULT_PAIR_COLORS[standard]
    if (!colors) return
    setPairs((current) =>
      current.map((pair, index) => {
        const [w1, w2] = splitColors(colors[index] ?? '')
        return { ...pair, wire1: w1, wire2: w2 }
      }),
    )
  }

  const handlePresetChange = (nextPreset: string) => {
    if (nextPreset === 'personalizado') return
    const functions = applyCablePreset(nextPreset as CablePresetId)
    setPairs((current) =>
      current.map((pair, index) => {
        const nextFunction = functions[index] ?? 'nao_utilizado'
        // clear camera_id when the pair leaves video
        const cameraId = nextFunction === 'video'
          ? pair.cameraId ?? (anchorCameraId && !current.some((p) => p.cameraId === anchorCameraId) ? anchorCameraId : null)
          : null
        return { ...pair, function: nextFunction, cameraId }
      }),
    )
  }

  const setPairAt = (index: number, updates: Partial<PairState>) => {
    setPairs((current) => current.map((pair, i) => (i === index ? { ...pair, ...updates } : pair)))
  }

  // Cameras occupied in this cable's other pairs
  const camerasUsedByOtherPairs = (currentIndex: number) =>
    pairs
      .filter((p, i) => i !== currentIndex && p.function === 'video' && p.cameraId)
      .map((p) => p.cameraId as string)

  // Cameras occupied in OTHER cables (any video pair)
  const camerasUsedByOtherCables = useMemo(() => {
    const set = new Set<string>()
    for (const cable of cables) {
      if (cable.id === loadedCableId) continue
      for (const pair of cable.utp_cable_pairs ?? []) {
        if (pair.function === 'video' && pair.camera_id) set.add(pair.camera_id)
      }
    }
    return set
  }, [cables, loadedCableId])

  const cameraOptionsFor = (index: number) => {
    const otherPairs = new Set(camerasUsedByOtherPairs(index))
    return availableCameras
      .filter((c) => c.connection_type === 'analogica')
      .map((c) => {
        const usedByOtherPair = otherPairs.has(c.id)
        const usedByOtherCable = camerasUsedByOtherCables.has(c.id)
        const label = usedByOtherPair
          ? `${c.name} — já em outro par deste cabo`
          : usedByOtherCable
            ? `${c.name} — já em outro cabo`
            : c.name + (c.location ? ` · ${c.location}` : '')
        return { value: c.id, label, disabled: usedByOtherPair || usedByOtherCable }
      })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    if (!isUtp(cableType)) {
      setError('Cabo não-UTP não é suportado neste cadastro. Use UTP Cat5/6.')
      setSaving(false)
      return
    }

    const wiringStandard =
      cameraEndStandard === equipmentEndStandard
        ? cameraEndStandard
        : `${cameraEndStandard}->${equipmentEndStandard}`

    const cablePayload = {
      name: name.trim() || null,
      cable_type: cableType,
      wiring_standard: wiringStandard,
      custom_color_order:
        cameraEndStandard === 'personalizado' || equipmentEndStandard === 'personalizado'
          ? customColorOrder || null
          : null,
      cable_length_meters: cableLengthMeters ? Number(cableLengthMeters) : null,
      has_splice: hasSplice,
      splice_location: hasSplice ? spliceLocation || null : null,
      splice_notes: hasSplice ? spliceNotes || null : null,
      notes: notes || null,
    }

    const pairInputs: UtpCablePairInput[] = pairs.map((pair, index) => ({
      pair_number: index + 1,
      function: pair.function,
      camera_id: pair.function === 'video' ? pair.cameraId : null,
      wire1_color: pair.wire1 || null,
      wire2_color: pair.wire2 || null,
    }))

    const result = loadedCableId
      ? await update(loadedCableId, cablePayload, pairInputs)
      : await create(cablePayload, pairInputs)

    if (result.error) {
      setError(result.error)
    } else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  const handleRemove = async () => {
    if (!loadedCableId) return
    if (!window.confirm('Remover este cabo? Câmeras que dependem dele ficarão sem vínculo de cabo.')) return
    setSaving(true)
    const result = await remove(loadedCableId)
    if (result.error) setError(result.error)
    else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  if (loadingCables) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const customWireOrder = pairs.flatMap((p) => [p.wire1, p.wire2])
  const presetInfo = CABLE_PRESETS[currentPreset]
  const videoCountConfigured = pairs.filter((p) => p.function === 'video').length
  const videoCountAssigned = pairs.filter((p) => p.function === 'video' && p.cameraId).length

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Nome + tipo + comprimento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Nome do cabo (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Tronco estacionamento"
        />
        <Select
          label="Tipo de Cabo"
          value={cableType}
          onChange={(e) => setCableType(e.target.value)}
          options={CABLE_TYPES.filter((c) => c.value.startsWith('utp_'))}
          required
        />
        <Input
          label="Comprimento (metros)"
          type="number"
          value={cableLengthMeters}
          onChange={(e) => setCableLengthMeters(e.target.value)}
          placeholder="Ex: 45.5"
          step="0.1"
          min="0"
        />
      </div>

      {/* Preset */}
      <div className="rounded-lg border border-accent/25 bg-accent/5 p-4 space-y-2">
        <Select
          label="Distribuição dos pares (preset)"
          value={currentPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          options={PRESET_OPTIONS}
        />
        <p className="text-xs text-text-secondary">{presetInfo.description}</p>
        {videoCountConfigured > 1 && (
          <p className="text-xs text-amber-500">
            Este cabo será compartilhado por {videoCountConfigured} câmeras — selecione uma câmera em cada par de vídeo abaixo.
          </p>
        )}
      </div>

      {/* Padrões */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Ponta da câmera"
          value={cameraEndStandard}
          onChange={(e) => handleCameraStandardChange(e.target.value)}
          options={WIRING_STANDARDS}
        />
        <Select
          label="Ponta do DVR / switch / balun"
          value={equipmentEndStandard}
          onChange={(e) => setEquipmentEndStandard(e.target.value)}
          options={WIRING_STANDARDS}
        />
      </div>

      {(cameraEndStandard === 'personalizado' || equipmentEndStandard === 'personalizado') && (
        <Input
          label="Descrição do padrão personalizado"
          value={customColorOrder}
          onChange={(e) => setCustomColorOrder(e.target.value)}
          placeholder="Descreva a sequência de cores usada"
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <CrimpPreview title="Ponta da câmera" standard={cameraEndStandard} customOrder={customWireOrder} />
        <CrimpPreview title="Ponta do equipamento" standard={equipmentEndStandard} customOrder={customWireOrder} />
      </div>

      {/* Pares */}
      <div className="space-y-3">
        {pairs.map((pair, index) => (
          <PairEditor
            key={index}
            pairNumber={index + 1}
            pair={pair}
            presetIsCustom={currentPreset === 'personalizado'}
            onChange={(updates) => setPairAt(index, updates)}
            cameraOptions={cameraOptionsFor(index)}
          />
        ))}
      </div>

      {videoCountConfigured > 0 && videoCountAssigned < videoCountConfigured && (
        <p className="text-xs text-amber-500">
          Faltam {videoCountConfigured - videoCountAssigned} câmera(s) para preencher os pares de vídeo.
        </p>
      )}

      {/* Emendas */}
      <div className="border-t border-border-light pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasSplice}
            onChange={(e) => setHasSplice(e.target.checked)}
            className="w-4 h-4 rounded border-border-light bg-bg-primary text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-text-primary">Possui emenda</span>
        </label>
        {hasSplice && (
          <div className="mt-3 space-y-3 pl-6">
            <Input
              label="Local da emenda"
              value={spliceLocation}
              onChange={(e) => setSpliceLocation(e.target.value)}
              placeholder="Ex: Caixa de passagem 2º andar"
            />
            <Input
              label="Observações da emenda"
              value={spliceNotes}
              onChange={(e) => setSpliceNotes(e.target.value)}
              placeholder="Ex: Emenda com conector IDC"
            />
          </div>
        )}
      </div>

      <Input
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Informações adicionais sobre o cabeamento"
      />

      <p className="text-xs text-text-muted">
        Alimentação externa (fonte separada ou cabo paralelo) é cadastrada em <strong>Cabos › Alimentação paralela</strong>.
      </p>

      <div className="flex justify-between pt-2">
        <div>
          {loadedCableId && (
            <Button type="button" variant="secondary" onClick={handleRemove} disabled={saving}>
              Remover cabo
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </form>
  )
}

interface PairEditorProps {
  pairNumber: number
  pair: PairState
  presetIsCustom: boolean
  onChange: (updates: Partial<PairState>) => void
  cameraOptions: Array<{ value: string; label: string; disabled?: boolean }>
}

function PairEditor({ pairNumber, pair, presetIsCustom, onChange, cameraOptions }: PairEditorProps) {
  const functionLabel = PAIR_FUNCTIONS.find((f) => f.value === pair.function)?.label ?? pair.function

  const wireStyle = useCallback((wire: string) => {
    const isWhite = wire.startsWith('Branco-')
    const base = wire.replace('Branco-', '')
    const color = WIRE_HEX[base] || '#64748b'
    return isWhite
      ? `repeating-linear-gradient(135deg, #f8fafc 0 5px, ${color} 5px 8px)`
      : color
  }, [])

  return (
    <div className="bg-bg-primary/50 border border-border-light/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
          Par {pairNumber}
        </span>
        <div className="flex-1 flex items-center gap-2">
          <span className="h-4 w-4 rounded-sm border border-white/20" style={{ background: wireStyle(pair.wire1) }} title={pair.wire1} />
          <span className="h-4 w-4 rounded-sm border border-white/20" style={{ background: wireStyle(pair.wire2) }} title={pair.wire2} />
        </div>
        {presetIsCustom ? (
          <div className="w-44">
            <Select
              value={pair.function}
              onChange={(e) => onChange({ function: e.target.value as PairFunction, cameraId: e.target.value === 'video' ? pair.cameraId : null })}
              options={PAIR_FUNCTIONS}
            />
          </div>
        ) : (
          <span className="text-xs text-text-secondary">{functionLabel}</span>
        )}
      </div>

      {pair.function === 'video' && (
        <Select
          label="Câmera atendida por este par"
          value={pair.cameraId ?? ''}
          onChange={(e) => onChange({ cameraId: e.target.value || null })}
          options={cameraOptions}
          placeholder="Selecione uma câmera analógica"
          required
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Fio 1"
          value={pair.wire1}
          onChange={(e) => onChange({ wire1: e.target.value })}
          options={WIRE_COLORS}
        />
        <Select
          label="Fio 2"
          value={pair.wire2}
          onChange={(e) => onChange({ wire2: e.target.value })}
          options={WIRE_COLORS}
        />
      </div>
    </div>
  )
}
