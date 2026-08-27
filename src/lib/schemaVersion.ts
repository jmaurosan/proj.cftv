export const REQUIRED_SCHEMA_VERSION = '2026.08.26.4'

export interface SchemaCompatibility {
  compatible: boolean
  currentVersion: string | null
  requiredVersion: string
  message: string
}

export function compareSchemaVersions(left: string, right: string): number {
  const parse = (value: string) => value.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const a = parse(left)
  const b = parse(right)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference > 0 ? 1 : -1
  }
  return 0
}

export function evaluateSchemaVersion(currentVersion: string | null): SchemaCompatibility {
  if (!currentVersion) {
    return {
      compatible: false,
      currentVersion: null,
      requiredVersion: REQUIRED_SCHEMA_VERSION,
      message: 'Não foi possível confirmar a versão do banco. Aplique a migration de contrato antes de cadastrar ou alterar equipamentos.',
    }
  }
  const compatible = compareSchemaVersions(currentVersion, REQUIRED_SCHEMA_VERSION) >= 0
  return {
    compatible,
    currentVersion,
    requiredVersion: REQUIRED_SCHEMA_VERSION,
    message: compatible
      ? 'Banco compatível com esta versão do aplicativo.'
      : `Banco desatualizado (${currentVersion}). Aplique a migration ${REQUIRED_SCHEMA_VERSION} antes de salvar alterações.`,
  }
}
