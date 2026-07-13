import { useState, useEffect, type FormEvent } from 'react'
import {
  CABLE_TYPES,
  WIRING_STANDARDS,
  PAIR_FUNCTIONS,
  DEFAULT_PAIR_COLORS,
  WIRE_COLORS,
} from '../../lib/constants'
import { useCableConnection } from '../../hooks/useCableConnection'
import {
  applyPairFunctionPreset,
  detectPairFunctionPreset,
  type PairFunctionPreset,
} from '../../lib/balunConfiguration'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface CableFormProps {
  cameraId: string
  onClose: () => void
  onSaved?: () => void
}

const isUtp = (type: string) => type.startsWith('utp_')

const PAIR_PRESET_OPTIONS = [
  { value: 'custom', label: 'Personalizado' },
  { value: 'video_only', label: '1 par para vídeo' },
  { value: 'video_power_1', label: '1 par vídeo + 1 par alimentação' },
  { value: 'video_power_2', label: '1 par vídeo + 2 pares alimentação' },
  { value: 'network_data', label: 'Todos os pares para dados' },
]

/** Split "Azul / Branco-Azul" into ["Azul", "Branco-Azul"] */
function splitColors(pair: string): [string, string] {
  const parts = pair.split(' / ')
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? '']
}

/** Join two wire colors into "Azul / Branco-Azul" */
function joinColors(a: string, b: string): string {
  return `${a} / ${b}`
}

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

const parseStoredStandards = (value: string | null) => {
  const stored = value || 'T568B'
  if (stored.includes('->')) {
    const [camera, equipment] = stored.split('->')
    return { camera: camera || 'T568B', equipment: equipment || 'T568B' }
  }
  return { camera: stored, equipment: stored }
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
      <div className="grid grid-cols-8 gap-1 mt-1">
        {order.map((wire, index) => (
          <span key={`${wire}-label-${index}`} className="text-[7px] text-text-muted text-center truncate" title={wire}>
            {wire.replace('Branco-', 'B/')}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function CableForm({ cameraId, onClose, onSaved }: CableFormProps) {
  const { data, loading: fetching, save, remove, fetch } = useCableConnection(cameraId)

  const [cableType, setCableType] = useState('utp_cat5')
  const [cameraEndStandard, setCameraEndStandard] = useState('T568B')
  const [equipmentEndStandard, setEquipmentEndStandard] = useState('T568B')
  const [customColorOrder, setCustomColorOrder] = useState('')

  // Each pair: two wire colors + function
  const [pair1Wire1, setPair1Wire1] = useState('Azul')
  const [pair1Wire2, setPair1Wire2] = useState('Branco-Azul')
  const [pair1Function, setPair1Function] = useState('dados')
  const [pair2Wire1, setPair2Wire1] = useState('Laranja')
  const [pair2Wire2, setPair2Wire2] = useState('Branco-Laranja')
  const [pair2Function, setPair2Function] = useState('dados')
  const [pair3Wire1, setPair3Wire1] = useState('Verde')
  const [pair3Wire2, setPair3Wire2] = useState('Branco-Verde')
  const [pair3Function, setPair3Function] = useState('dados')
  const [pair4Wire1, setPair4Wire1] = useState('Marrom')
  const [pair4Wire2, setPair4Wire2] = useState('Branco-Marrom')
  const [pair4Function, setPair4Function] = useState('dados')

  const [hasSplice, setHasSplice] = useState(false)
  const [spliceLocation, setSpliceLocation] = useState('')
  const [spliceNotes, setSpliceNotes] = useState('')
  const [hasExternalPower, setHasExternalPower] = useState(false)
  const [powerSourceInfo, setPowerSourceInfo] = useState('')
  const [cableLengthMeters, setCableLengthMeters] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing cable data
  useEffect(() => {
    fetch()
  }, [fetch])

  // Populate form when data loads
  useEffect(() => {
    if (!data) return
    setCableType(data.cable_type)
    const standards = parseStoredStandards(data.wiring_standard)
    setCameraEndStandard(standards.camera)
    setEquipmentEndStandard(standards.equipment)
    setCustomColorOrder(data.custom_color_order ?? '')

    const [p1a, p1b] = splitColors(data.pair1_colors)
    setPair1Wire1(p1a); setPair1Wire2(p1b)
    setPair1Function(data.pair1_function)

    const [p2a, p2b] = splitColors(data.pair2_colors)
    setPair2Wire1(p2a); setPair2Wire2(p2b)
    setPair2Function(data.pair2_function)

    const [p3a, p3b] = splitColors(data.pair3_colors)
    setPair3Wire1(p3a); setPair3Wire2(p3b)
    setPair3Function(data.pair3_function)

    const [p4a, p4b] = splitColors(data.pair4_colors)
    setPair4Wire1(p4a); setPair4Wire2(p4b)
    setPair4Function(data.pair4_function)

    setHasSplice(data.has_splice)
    setSpliceLocation(data.splice_location ?? '')
    setSpliceNotes(data.splice_notes ?? '')
    setHasExternalPower(data.has_external_power)
    setPowerSourceInfo(data.power_source_info ?? '')
    setCableLengthMeters(data.cable_length_meters?.toString() ?? '')
    setNotes(data.notes ?? '')
  }, [data])

  // Auto-fill colors when wiring standard changes
  const handleCameraStandardChange = (standard: string) => {
    setCameraEndStandard(standard)
    const colors = DEFAULT_PAIR_COLORS[standard]
    if (colors) {
      const [p1a, p1b] = splitColors(colors[0])
      setPair1Wire1(p1a); setPair1Wire2(p1b)
      const [p2a, p2b] = splitColors(colors[1])
      setPair2Wire1(p2a); setPair2Wire2(p2b)
      const [p3a, p3b] = splitColors(colors[2])
      setPair3Wire1(p3a); setPair3Wire2(p3b)
      const [p4a, p4b] = splitColors(colors[3])
      setPair4Wire1(p4a); setPair4Wire2(p4b)
    }
  }

  const handlePairPresetChange = (preset: string) => {
    if (preset === 'custom') return
    const [pair1, pair2, pair3, pair4] = applyPairFunctionPreset(preset as PairFunctionPreset)
    setPair1Function(pair1)
    setPair2Function(pair2)
    setPair3Function(pair3)
    setPair4Function(pair4)
    if ([pair1, pair2, pair3, pair4].includes('alimentacao')) setHasExternalPower(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      cable_type: cableType,
      wiring_standard: isUtp(cableType)
        ? cameraEndStandard === equipmentEndStandard
          ? cameraEndStandard
          : `${cameraEndStandard}->${equipmentEndStandard}`
        : null,
      custom_color_order: cameraEndStandard === 'personalizado' || equipmentEndStandard === 'personalizado' ? customColorOrder : null,
      pair1_function: isUtp(cableType) ? pair1Function : null,
      pair1_colors: isUtp(cableType) ? joinColors(pair1Wire1, pair1Wire2) : null,
      pair2_function: isUtp(cableType) ? pair2Function : null,
      pair2_colors: isUtp(cableType) ? joinColors(pair2Wire1, pair2Wire2) : null,
      pair3_function: isUtp(cableType) ? pair3Function : null,
      pair3_colors: isUtp(cableType) ? joinColors(pair3Wire1, pair3Wire2) : null,
      pair4_function: isUtp(cableType) ? pair4Function : null,
      pair4_colors: isUtp(cableType) ? joinColors(pair4Wire1, pair4Wire2) : null,
      has_splice: hasSplice,
      splice_location: hasSplice ? spliceLocation || null : null,
      splice_notes: hasSplice ? spliceNotes || null : null,
      has_external_power: hasExternalPower,
      power_source_info: hasExternalPower ? powerSourceInfo || null : null,
      cable_length_meters: cableLengthMeters ? Number(cableLengthMeters) : null,
      notes: notes || null,
    }

    const result = await save(payload)
    if (result.error) setError(result.error)
    else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  const handleRemove = async () => {
    setSaving(true)
    const result = await remove()
    if (result.error) setError(result.error)
    else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pairs = [
    { n: 1, w1: pair1Wire1, setW1: setPair1Wire1, w2: pair1Wire2, setW2: setPair1Wire2, fn: pair1Function, setFn: setPair1Function },
    { n: 2, w1: pair2Wire1, setW1: setPair2Wire1, w2: pair2Wire2, setW2: setPair2Wire2, fn: pair2Function, setFn: setPair2Function },
    { n: 3, w1: pair3Wire1, setW1: setPair3Wire1, w2: pair3Wire2, setW2: setPair3Wire2, fn: pair3Function, setFn: setPair3Function },
    { n: 4, w1: pair4Wire1, setW1: setPair4Wire1, w2: pair4Wire2, setW2: setPair4Wire2, fn: pair4Function, setFn: setPair4Function },
  ]
  const currentPairPreset = detectPairFunctionPreset(pairs.map((pair) => pair.fn))
  const customWireOrder = [
    pair1Wire1, pair1Wire2,
    pair2Wire1, pair2Wire2,
    pair3Wire1, pair3Wire2,
    pair4Wire1, pair4Wire2,
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Tipo de Cabo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Tipo de Cabo"
          value={cableType}
          onChange={(e) => setCableType(e.target.value)}
          options={CABLE_TYPES}
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

      {/* Secao UTP - Padrao e Pares */}
      {isUtp(cableType) && (
        <>
          <div className="border-t border-border-light pt-4">
            <h4 className="text-sm font-semibold text-text-primary mb-3">Configuração dos Pares</h4>
            <div className="mb-4 rounded-lg border border-border-light bg-bg-primary/40 p-3">
              <Select
                label="Distribuição rápida dos pares"
                value={currentPairPreset}
                onChange={(event) => handlePairPresetChange(event.target.value)}
                options={PAIR_PRESET_OPTIONS}
              />
              <p className="mt-2 text-[10px] text-text-muted">
                O preset altera apenas a função dos pares. As cores permanecem editáveis abaixo.
              </p>
            </div>
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-4">
              <CrimpPreview title="Ponta da câmera" standard={cameraEndStandard} customOrder={customWireOrder} />
              <CrimpPreview title="Ponta do equipamento" standard={equipmentEndStandard} customOrder={customWireOrder} />
            </div>

            <div className="mt-3 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-text-secondary">
              {cameraEndStandard === equipmentEndStandard
                ? `Ligação direta: ${cameraEndStandard}-${equipmentEndStandard}`
                : `Ligação cruzada/personalizada: ${cameraEndStandard}-${equipmentEndStandard}`}
            </div>
          </div>

          {(cameraEndStandard === 'personalizado' || equipmentEndStandard === 'personalizado') && (
            <Input
              label="Descrição do padrão personalizado"
              value={customColorOrder}
              onChange={(e) => setCustomColorOrder(e.target.value)}
              placeholder="Descreva a sequência de cores usada"
            />
          )}

          {/* Pairs with color selects */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {pairs.map(({ n, w1, w2, fn }) => {
                const functionLabel = PAIR_FUNCTIONS.find((option) => option.value === fn)?.label || fn
                const wireStyle = (wire: string) => {
                  const isWhite = wire.startsWith('Branco-')
                  const base = wire.replace('Branco-', '')
                  const color = WIRE_HEX[base] || '#64748b'
                  return isWhite
                    ? `repeating-linear-gradient(135deg, #f8fafc 0 5px, ${color} 5px 8px)`
                    : color
                }
                return (
                  <div key={`pair-summary-${n}`} className="rounded-lg border border-border-light bg-bg-primary/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-text-primary">Par {n}</span>
                      <span className="text-[9px] text-accent text-right">{functionLabel}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {[w1, w2].map((wire, index) => (
                        <span
                          key={`${wire}-${index}`}
                          className="h-5 rounded-sm border border-white/20"
                          style={{ background: wireStyle(wire) }}
                          title={wire}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {pairs.map(({ n, w1, setW1, w2, setW2, fn, setFn }) => (
              <div key={n} className="bg-bg-primary/50 border border-border-light/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                    Par {n}
                  </span>
                  <div className="flex-1" />
                  <div className="w-40">
                    <Select
                      value={fn}
                      onChange={(e) => setFn(e.target.value)}
                      options={PAIR_FUNCTIONS}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Fio 1"
                    value={w1}
                    onChange={(e) => setW1(e.target.value)}
                    options={WIRE_COLORS}
                  />
                  <Select
                    label="Fio 2"
                    value={w2}
                    onChange={(e) => setW2(e.target.value)}
                    options={WIRE_COLORS}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
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

      {/* Alimentacao Externa */}
      <div className="border-t border-border-light pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasExternalPower}
            onChange={(e) => setHasExternalPower(e.target.checked)}
            className="w-4 h-4 rounded border-border-light bg-bg-primary text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-text-primary">Alimentação externa</span>
        </label>

        {hasExternalPower && (
          <div className="mt-3 pl-6">
            <Input
              label="Informações da fonte"
              value={powerSourceInfo}
              onChange={(e) => setPowerSourceInfo(e.target.value)}
              placeholder="Ex: Fonte 12V 5A - Rack principal"
            />
          </div>
        )}
      </div>

      {/* Observacoes */}
      <Input
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Informações adicionais sobre o cabeamento"
      />

      {/* Botoes */}
      <div className="flex justify-between pt-2">
        <div>
          {data && (
            <Button type="button" variant="secondary" onClick={handleRemove} disabled={saving}>
              Remover Cabeamento
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
