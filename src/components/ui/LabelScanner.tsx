import { useRef, useState, useCallback } from 'react'
import { ScanLine, Camera as CameraIcon, X, RotateCcw, Check, Loader2 } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import {
  extractEquipmentLabel,
  isGeminiConfigured,
  type EquipmentLabelData,
  type EquipmentLabelKind,
} from '../../services/geminiService'

interface LabelScannerProps {
  equipmentType: EquipmentLabelKind
  onResult: (data: EquipmentLabelData) => void
  disabled?: boolean
  buttonLabel?: string
}

type Phase = 'idle' | 'processing' | 'review' | 'error'

// MAC AA:BB:CC:DD:EE:FF (também aceita separador -)
const MAC_REGEX = /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i

/**
 * Compacta uma imagem no client via canvas antes de enviar ao Gemini.
 * Reduz custo de tokens e tempo de upload sem prejudicar OCR.
 */
async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas 2D indisponível'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Falha ao decodificar a imagem'))
      img.src = String(reader.result ?? '')
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Tenta ler QR/barcode via API nativa (Chrome/Edge/iOS17+).
 * Retorna string bruta do primeiro código encontrado, ou null se indisponível/nada achado.
 */
async function tryBarcodeDetector(dataUrl: string): Promise<string | null> {
  const BarcodeDetectorCtor = (window as unknown as {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
    }
  }).BarcodeDetector
  if (!BarcodeDetectorCtor) return null
  try {
    const detector = new BarcodeDetectorCtor({
      formats: ['qr_code', 'code_128', 'code_39', 'data_matrix', 'ean_13'],
    })
    const img = await fetch(dataUrl).then((r) => r.blob())
    const bitmap = await createImageBitmap(img)
    const results = await detector.detect(bitmap)
    bitmap.close?.()
    return results[0]?.rawValue?.trim() || null
  } catch {
    return null
  }
}

const emptyData: EquipmentLabelData = {
  brand: null,
  model: null,
  serial_number: null,
  mac_address: null,
  notes: null,
}

const KIND_LABEL: Record<EquipmentLabelKind, string> = {
  camera: 'câmera',
  dvr: 'DVR',
  router: 'roteador',
  switch: 'switch',
  balun: 'balun',
  power_supply: 'fonte',
  generic: 'equipamento',
}

export default function LabelScanner({
  equipmentType,
  onResult,
  disabled,
  buttonLabel = 'Escanear etiqueta',
}: LabelScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<EquipmentLabelData>(emptyData)
  const [source, setSource] = useState<string>('') // 'qr+gemini' | 'gemini' | 'qr'

  const kindLabel = KIND_LABEL[equipmentType]

  const reset = useCallback(() => {
    setPhase('idle')
    setPreviewUrl(null)
    setErrorMessage(null)
    setResult(emptyData)
    setSource('')
  }, [])

  const close = () => {
    reset()
    setOpen(false)
  }

  const startCapture = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.click(), 50)
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPhase('processing')
    setErrorMessage(null)

    try {
      const dataUrl = await compressImage(file)
      setPreviewUrl(dataUrl)

      const [qrValue, geminiResult] = await Promise.all([
        tryBarcodeDetector(dataUrl),
        isGeminiConfigured()
          ? extractEquipmentLabel(dataUrl, equipmentType)
          : Promise.resolve({ data: null, error: 'Gemini não configurado (VITE_GEMINI_API_KEY ausente).' }),
      ])

      const merged: EquipmentLabelData = { ...(geminiResult.data ?? emptyData) }

      // QR override: se veio texto, tem preferência sobre o SN inferido pela IA.
      // Se parecer MAC, cai em mac_address.
      let usedQr = false
      if (qrValue) {
        if (MAC_REGEX.test(qrValue)) {
          merged.mac_address = qrValue.toUpperCase().replace(/-/g, ':')
        } else {
          merged.serial_number = qrValue
        }
        usedQr = true
      }

      const hasSomething = merged.brand || merged.model || merged.serial_number || merged.mac_address
      if (!hasSomething) {
        setPhase('error')
        setErrorMessage(geminiResult.error ?? 'Nada legível na etiqueta. Tente uma foto mais nítida.')
        return
      }

      setResult(merged)
      setSource(usedQr && geminiResult.data ? 'qr+gemini' : usedQr ? 'qr' : 'gemini')
      setPhase('review')
    } catch (error) {
      setPhase('error')
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const applyResult = () => {
    onResult(result)
    close()
  }

  const editField = (field: keyof EquipmentLabelData, value: string) => {
    setResult((current) => ({ ...current, [field]: value.trim() || null }))
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={startCapture}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-accent/40 text-accent bg-accent/5 hover:bg-accent/10 hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ScanLine className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>

      <Modal open={open} onClose={close} title={`Escanear etiqueta — ${kindLabel}`} size="md">
        <div className="space-y-4">
          {phase === 'idle' && (
            <div className="text-center py-8 space-y-3">
              <CameraIcon className="w-12 h-12 mx-auto text-text-muted" />
              <p className="text-sm text-text-secondary">
                Aponte a câmera para a etiqueta do equipamento e tire uma foto nítida.
              </p>
              <Button onClick={() => inputRef.current?.click()}>
                <CameraIcon className="w-4 h-4 mr-2" />
                Abrir câmera
              </Button>
            </div>
          )}

          {phase === 'processing' && (
            <div className="text-center py-8 space-y-3">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Prévia da etiqueta"
                  className="mx-auto max-h-48 rounded-md border border-border-light"
                />
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Lendo etiqueta…
              </div>
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Etiqueta escaneada"
                  className="mx-auto max-h-40 rounded-md border border-border-light"
                />
              )}
              <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-xs text-text-secondary">
                {source === 'qr+gemini' && 'SN extraído do QR + demais campos via IA.'}
                {source === 'qr' && 'Dados extraídos do QR code.'}
                {source === 'gemini' && 'Dados extraídos via IA (Gemini Vision).'}
              </div>

              <div className="space-y-2">
                <FieldRow label="Marca" value={result.brand} onChange={(v) => editField('brand', v)} />
                <FieldRow label="Modelo" value={result.model} onChange={(v) => editField('model', v)} />
                <FieldRow label="Nº de série" value={result.serial_number} onChange={(v) => editField('serial_number', v)} />
                <FieldRow label="MAC" value={result.mac_address} onChange={(v) => editField('mac_address', v)} />
                {result.notes && (
                  <FieldRow label="Notas" value={result.notes} onChange={(v) => editField('notes', v)} />
                )}
              </div>

              <p className="text-xs text-text-muted">
                Confira os dados. Ao aplicar, campos vazios do formulário serão preenchidos e campos já preenchidos serão respeitados (você decide manter ou substituir na tela seguinte, se houver conflito).
              </p>

              <div className="flex justify-between gap-2">
                <Button variant="secondary" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Nova foto
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={close}>Cancelar</Button>
                  <Button onClick={applyResult}>
                    <Check className="w-4 h-4 mr-1" />
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-3">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Etiqueta"
                  className="mx-auto max-h-40 rounded-md border border-border-light opacity-60"
                />
              )}
              <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger flex items-start gap-2">
                <X className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage ?? 'Erro desconhecido.'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="secondary" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Tentar de novo
                </Button>
                <Button variant="secondary" onClick={close}>Fechar</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

interface FieldRowProps {
  label: string
  value: string | null
  onChange: (value: string) => void
}

function FieldRow({ label, value, onChange }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 items-center">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={value === null ? '— não detectado —' : ''}
        className="w-full px-2 py-1.5 text-sm rounded-md border border-border-light bg-bg-primary text-text-primary focus:ring-1 focus:ring-accent focus:border-accent"
      />
    </div>
  )
}
