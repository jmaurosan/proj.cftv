import { supabase } from './supabase'
import { evaluateSchemaVersion, type SchemaCompatibility } from './schemaVersion'

export { REQUIRED_SCHEMA_VERSION } from './schemaVersion'
export type { SchemaCompatibility } from './schemaVersion'

let cachedResult: SchemaCompatibility | null = null
let cachedAt = 0
const CACHE_DURATION_MS = 60_000

export async function getSchemaCompatibility(force = false): Promise<SchemaCompatibility> {
  if (!force && cachedResult && Date.now() - cachedAt < CACHE_DURATION_MS) return cachedResult

  const { data, error } = await supabase.rpc('current_app_schema_version')
  const result = error
    ? evaluateSchemaVersion(null)
    : evaluateSchemaVersion(typeof data === 'string' ? data : null)
  cachedResult = result
  cachedAt = Date.now()
  return result
}

export async function requireCompatibleSchema(): Promise<Error | null> {
  const status = await getSchemaCompatibility()
  return status.compatible ? null : new Error(status.message)
}

export function clearSchemaCompatibilityCache() {
  cachedResult = null
  cachedAt = 0
}
