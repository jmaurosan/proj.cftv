import { Building2, AlertTriangle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClient } from '../../contexts/ClientContext'

/**
 * Banner exibido no topo das páginas de equipamentos para indicar
 * qual cliente está sendo filtrado. Quando nenhum cliente é selecionado,
 * mostra um aviso para que o usuário escolha um — evitando misturar dados.
 */
export default function ClientFilterBanner() {
  const { selectedClientId, selectedClientName, clearSelectedClient } = useClient()
  const navigate = useNavigate()

  if (selectedClientId && selectedClientName) {
    return (
      <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span>
            Exibindo dados de: <strong className="text-primary">{selectedClientName}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={clearSelectedClient}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors"
          title="Limpar filtro de cliente"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Limpar filtro</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-warning/10 border border-warning/30 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-text-primary">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <span>
          Nenhum cliente selecionado. Você está vendo dados de todos os clientes.
        </span>
      </div>
      <button
        type="button"
        onClick={() => navigate('/clientes')}
        className="text-xs font-medium text-primary hover:underline shrink-0"
      >
        Selecionar cliente
      </button>
    </div>
  )
}
