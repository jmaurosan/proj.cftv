export type TechnicalSymbolKind =
  | 'camera_dome'
  | 'camera_bullet'
  | 'camera_ptz'
  | 'camera_wifi'
  | 'dvr'
  | 'nvr'
  | 'switch'
  | 'router'
  | 'balun'
  | 'power_balun'
  | 'power_supply'
  | 'ups'

export interface TechnicalSymbol {
  id: string
  kind: TechnicalSymbolKind
  label: string
  x: number
  y: number
}

export const TECHNICAL_SYMBOL_CATALOG: Array<{ kind: TechnicalSymbolKind; label: string }> = [
  { kind: 'camera_dome', label: 'Câmera dome' },
  { kind: 'camera_bullet', label: 'Câmera bullet' },
  { kind: 'camera_ptz', label: 'Câmera PTZ' },
  { kind: 'camera_wifi', label: 'Câmera Wi-Fi' },
  { kind: 'dvr', label: 'DVR' },
  { kind: 'nvr', label: 'NVR' },
  { kind: 'switch', label: 'Switch' },
  { kind: 'router', label: 'Roteador' },
  { kind: 'balun', label: 'Balun passivo' },
  { kind: 'power_balun', label: 'Power Balun' },
  { kind: 'power_supply', label: 'Fonte' },
  { kind: 'ups', label: 'Nobreak' },
]

export function createTechnicalSymbol(
  kind: TechnicalSymbolKind,
  position: { x: number; y: number },
  id = crypto.randomUUID(),
): TechnicalSymbol {
  const catalogItem = TECHNICAL_SYMBOL_CATALOG.find((item) => item.kind === kind)
  if (!catalogItem) throw new Error('Símbolo técnico inválido.')
  return { id, kind, label: catalogItem.label, ...position }
}

export function duplicateTechnicalSymbols(
  symbols: TechnicalSymbol[],
  selectedIds: string[],
  idFactory = () => crypto.randomUUID(),
) {
  return symbols
    .filter((symbol) => selectedIds.includes(symbol.id))
    .map((symbol) => ({
      ...symbol,
      id: idFactory(),
      x: Math.min(98, symbol.x + 2.5),
      y: Math.min(98, symbol.y + 2.5),
    }))
}
