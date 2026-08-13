import type { EquipmentLabelData } from '../services/geminiService'

export type ScannableField = 'brand' | 'model' | 'serial_number' | 'mac_address'

export interface FieldTarget {
  key: ScannableField
  label: string
  current: string
  setter: (value: string) => void
}

/**
 * Aplica dados escaneados nos campos alvo com resolução de conflitos:
 *  - Campo vazio + valor escaneado → preenche direto.
 *  - Campo com valor + escaneado diferente → confirma via window.confirm.
 *  - Campo já igual ou sem valor escaneado → não faz nada.
 *
 * Retorna resumo para exibir num toast, ex: "3 campos preenchidos, 1 mantido".
 */
export function applyScannedLabel(
  scanned: EquipmentLabelData,
  targets: FieldTarget[],
): { filled: number; overwritten: number; kept: number } {
  let filled = 0
  let overwritten = 0
  let kept = 0

  const conflicts: FieldTarget[] = []

  for (const target of targets) {
    const scannedValue = scanned[target.key]
    if (!scannedValue) continue
    if (!target.current.trim()) {
      target.setter(scannedValue)
      filled += 1
      continue
    }
    if (target.current.trim() === scannedValue.trim()) continue
    conflicts.push(target)
  }

  if (conflicts.length > 0) {
    const summary = conflicts
      .map((t) => `• ${t.label}: "${t.current}" → "${scanned[t.key]}"`)
      .join('\n')
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Substituir campos já preenchidos?\n\n${summary}`)
      : false
    if (confirmed) {
      for (const target of conflicts) {
        const value = scanned[target.key]
        if (value) {
          target.setter(value)
          overwritten += 1
        }
      }
    } else {
      kept = conflicts.length
    }
  }

  return { filled, overwritten, kept }
}
