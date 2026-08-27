import { Database, RefreshCw, ShieldAlert } from 'lucide-react'
import { useSchemaCompatibility } from '../../hooks/useSchemaCompatibility'

export default function SchemaCompatibilityBanner() {
  const { status, loading, refresh } = useSchemaCompatibility()
  if (loading || !status || status.compatible) return null

  return (
    <div className="mx-3 mt-3 flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm sm:mx-4 sm:flex-row sm:items-center lg:mx-6">
      <ShieldAlert className="h-5 w-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-danger">Banco de dados precisa ser atualizado</p>
        <p className="mt-0.5 text-text-secondary">{status.message} Consultas continuam disponíveis, mas gravações críticas estão protegidas.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
        <Database className="h-4 w-4" />
        <span>Exigida: {status.requiredVersion}</span>
        <button type="button" onClick={() => void refresh()} className="rounded-md p-2 text-text-secondary hover:bg-danger/10 hover:text-text-primary" aria-label="Verificar banco novamente">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
