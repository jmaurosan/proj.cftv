export const DEMO_LOGIN_ALIAS = 'digixs'
export const DEMO_LOGIN_EMAIL = 'visitante@residencial-digixs.invalid'

export function resolveLoginIdentifier(identifier: string, demoMode: boolean) {
  const normalized = identifier.trim()
  if (demoMode && normalized.toLocaleLowerCase('pt-BR') === DEMO_LOGIN_ALIAS) {
    return DEMO_LOGIN_EMAIL
  }
  return normalized
}
