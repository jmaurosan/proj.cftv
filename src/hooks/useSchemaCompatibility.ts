import { useCallback, useEffect, useState } from 'react'
import {
  getSchemaCompatibility,
  type SchemaCompatibility,
} from '../lib/schemaCompatibility'

export function useSchemaCompatibility() {
  const [status, setStatus] = useState<SchemaCompatibility | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setStatus(await getSchemaCompatibility(true))
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { status, loading, refresh }
}
