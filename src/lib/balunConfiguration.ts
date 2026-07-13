export type PairFunction = 'video' | 'dados' | 'alimentacao' | 'nao_utilizado'
export type PairFunctionPreset = 'video_only' | 'video_power_1' | 'video_power_2' | 'network_data'
export type BalunKind = 'passive' | 'power'

const PAIR_PRESETS: Record<PairFunctionPreset, [PairFunction, PairFunction, PairFunction, PairFunction]> = {
  video_only: ['video', 'nao_utilizado', 'nao_utilizado', 'nao_utilizado'],
  video_power_1: ['video', 'alimentacao', 'nao_utilizado', 'nao_utilizado'],
  video_power_2: ['video', 'alimentacao', 'alimentacao', 'nao_utilizado'],
  network_data: ['dados', 'dados', 'dados', 'dados'],
}

export function applyPairFunctionPreset(preset: PairFunctionPreset) {
  return [...PAIR_PRESETS[preset]] as [PairFunction, PairFunction, PairFunction, PairFunction]
}

export function detectPairFunctionPreset(functions: string[]): PairFunctionPreset | 'custom' {
  const match = (Object.entries(PAIR_PRESETS) as Array<[PairFunctionPreset, PairFunction[]]>).find(
    ([, presetFunctions]) => presetFunctions.every((value, index) => value === functions[index]),
  )
  return match?.[0] ?? 'custom'
}

export function resolvePowerSourceForBalun(balunType: BalunKind, currentPowerSource: string) {
  if (balunType === 'power') return 'power_balun'
  return currentPowerSource === 'power_balun' ? 'power_supply' : currentPowerSource
}

export function getBalunOptionLabel(name: string, balunType: BalunKind) {
  return `${name} · ${balunType === 'passive' ? 'Balun passivo' : 'Power Balun'}`
}
