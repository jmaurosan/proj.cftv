import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useClient } from '../../contexts/ClientContext'
import { usePowerCables } from '../../hooks/usePowerCables'
import type { Camera } from '../../lib/types'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { Search } from 'lucide-react'

interface PowerCableFormProps {
  powerCableId?: string
  onClose: () => void
  onSaved?: () => void
}

const GAUGE_OPTIONS = [
  { value: '', label: 'Selecione a bitola' },
  { value: '0.75', label: '0,75 mm²' },
  { value: '1.0', label: '1,0 mm²' },
  { value: '1.5', label: '1,5 mm²' },
  { value: '2.5', label: '2,5 mm²' },
  { value: '4.0', label: '4,0 mm²' },
  { value: '6.0', label: '6,0 mm²' },
  { value: '10.0', label: '10,0 mm²' },
]

const VOLTAGE_OPTIONS = [
  { value: '', label: 'Selecione a tensão' },
  { value: '12V', label: '12V' },
  { value: '24V', label: '24V' },
  { value: '48V', label: '48V' },
]

export default function PowerCableForm({ powerCableId, onClose, onSaved }: PowerCableFormProps) {
  const { selectedClientId } = useClient()
  const { data: cables, loading: loadingCables, create, update, remove } = usePowerCables()

  const [name, setName] = useState('')
  const [wireGauge, setWireGauge] = useState('')
  const [voltage, setVoltage] = useState('12V')
  const [cableLengthMeters, setCableLengthMeters] = useState('')
  const [powerSourceInfo, setPowerSourceInfo] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<string>>(new Set())
  const [cameraFilter, setCameraFilter] = useState('')

  const [availableCameras, setAvailableCameras] = useState<Camera[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

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

  const targetCable = useMemo(
    () => (powerCableId ? cables.find((c) => c.id === powerCableId) ?? null : null),
    [cables, powerCableId],
  )

  useEffect(() => {
    if (!targetCable || loadedId === targetCable.id) return
    setLoadedId(targetCable.id)
    setName(targetCable.name)
    setWireGauge(targetCable.wire_gauge_mm2?.toString() ?? '')
    setVoltage(targetCable.voltage ?? '12V')
    setCableLengthMeters(targetCable.cable_length_meters?.toString() ?? '')
    setPowerSourceInfo(targetCable.power_source_info ?? '')
    setNotes(targetCable.notes ?? '')
    setSelectedCameraIds(new Set(targetCable.camera_ids ?? []))
  }, [targetCable, loadedId])

  const toggleCamera = (id: string) => {
    setSelectedCameraIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredCameras = useMemo(() => {
    if (!cameraFilter.trim()) return availableCameras
    const needle = cameraFilter.trim().toLocaleLowerCase('pt-BR')
    return availableCameras.filter((c) => {
      const haystack = `${c.name} ${c.location ?? ''}`.toLocaleLowerCase('pt-BR')
      return haystack.includes(needle)
    })
  }, [availableCameras, cameraFilter])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    if (!name.trim()) {
      setError('Nome do cabo é obrigatório.')
      setSaving(false)
      return
    }

    const payload = {
      name: name.trim(),
      wire_gauge_mm2: wireGauge ? Number(wireGauge) : null,
      voltage: voltage || null,
      cable_length_meters: cableLengthMeters ? Number(cableLengthMeters) : null,
      power_source_info: powerSourceInfo.trim() || null,
      notes: notes.trim() || null,
    }

    const cameraIds = Array.from(selectedCameraIds)

    const result = loadedId
      ? await update(loadedId, payload, cameraIds)
      : await create(payload, cameraIds)

    if (result.error) {
      setError(result.error)
    } else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  const handleRemove = async () => {
    if (!loadedId) return
    if (!window.confirm('Remover este cabo de alimentação? As câmeras vinculadas ficarão sem esta fonte externa.')) return
    setSaving(true)
    const result = await remove(loadedId)
    if (result.error) setError(result.error)
    else {
      onSaved?.()
      onClose()
    }
    setSaving(false)
  }

  if (loadingCables && powerCableId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome do cabo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Alimentação estacionamento"
          required
        />
        <Input
          label="Comprimento (metros)"
          type="number"
          value={cableLengthMeters}
          onChange={(e) => setCableLengthMeters(e.target.value)}
          placeholder="Ex: 30"
          step="0.1"
          min="0"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Bitola do fio"
          value={wireGauge}
          onChange={(e) => setWireGauge(e.target.value)}
          options={GAUGE_OPTIONS}
        />
        <Select
          label="Tensão"
          value={voltage}
          onChange={(e) => setVoltage(e.target.value)}
          options={VOLTAGE_OPTIONS}
        />
      </div>

      <Input
        label="Fonte / Estabilizador"
        value={powerSourceInfo}
        onChange={(e) => setPowerSourceInfo(e.target.value)}
        placeholder="Ex: Hayonik Master II 12V 10A · Rack principal"
      />

      <div className="border border-border-light rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Câmeras alimentadas ({selectedCameraIds.size})
          </h3>
          <div className="relative w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              placeholder="Filtrar câmeras"
              className="w-full pl-7 pr-2 py-1.5 text-sm rounded-md border border-border-light bg-bg-primary text-text-primary focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        {availableCameras.length === 0 ? (
          <p className="text-xs text-text-muted">Nenhuma câmera cadastrada para este cliente.</p>
        ) : filteredCameras.length === 0 ? (
          <p className="text-xs text-text-muted">Nenhuma câmera corresponde ao filtro.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredCameras.map((camera) => {
              const checked = selectedCameraIds.has(camera.id)
              return (
                <label
                  key={camera.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer border ${
                    checked
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-transparent hover:border-border-light hover:bg-bg-primary/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCamera(camera.id)}
                    className="w-4 h-4 rounded border-border-light bg-bg-primary text-accent focus:ring-accent"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text-primary truncate">{camera.name}</span>
                    {camera.location && (
                      <span className="block text-[11px] text-text-muted truncate">{camera.location}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <Input
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas sobre o percurso, proteções, etc."
      />

      <div className="flex justify-between pt-2">
        <div>
          {loadedId && (
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
