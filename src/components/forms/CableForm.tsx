import { useState, useEffect, type FormEvent } from 'react'
import type { CableConnection } from '../../lib/types'
import {
  CABLE_TYPES,
  WIRING_STANDARDS,
  PAIR_FUNCTIONS,
  DEFAULT_PAIR_COLORS,
  WIRE_COLORS,
} from '../../lib/constants'
import { useCableConnection } from '../../hooks/useCableConnection'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

interface CableFormProps {
  cameraId: string
  onClose: () => void
  onSaved?: () => void
}

const isUtp = (type: string) => type.startsWith('utp_')

/** Split "Azul / Branco-Azul" into ["Azul", "Branco-Azul"] */
function splitColors(pair: string): [string, string] {
  const parts = pair.split(' / ')
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? '']
}

/** Join two wire colors into "Azul / Branco-Azul" */
function joinColors(a: string, b: string): string {
  return `${a} / ${b}`
}

export default function CableForm({ cameraId, onClose, onSaved }: CableFormProps) {
  const { data, loading: fetching, save, remove, fetch } = useCableConnection(cameraId)

  const [cableType, setCableType] = useState('utp_cat5')
  const [wiringStandard, setWiringStandard] = useState('T568B')
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
    setWiringStandard(data.wiring_standard ?? 'T568B')
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
  const handleStandardChange = (standard: string) => {
    setWiringStandard(standard)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      cable_type: cableType,
      wiring_standard: isUtp(cableType) ? wiringStandard : null,
      custom_color_order: wiringStandard === 'personalizado' ? customColorOrder : null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Tipo de Cabo */}
      <div className="grid grid-cols-2 gap-4">
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
            <Select
              label="Padrão de Cores"
              value={wiringStandard}
              onChange={(e) => handleStandardChange(e.target.value)}
              options={WIRING_STANDARDS}
            />
          </div>

          {wiringStandard === 'personalizado' && (
            <Input
              label="Descrição do padrão personalizado"
              value={customColorOrder}
              onChange={(e) => setCustomColorOrder(e.target.value)}
              placeholder="Descreva a sequência de cores usada"
            />
          )}

          {/* Pairs with color selects */}
          <div className="space-y-4">
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
                <div className="grid grid-cols-2 gap-3">
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
            {saving ? 'Salvando...' : data ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
      </div>
    </form>
  )
}
