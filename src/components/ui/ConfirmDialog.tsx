import { AlertTriangle } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'

type ConfirmVariant = 'danger' | 'primary'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading?: boolean
  confirmLabel?: string
  loadingLabel?: string
  confirmVariant?: ConfirmVariant
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmLabel = 'Excluir',
  loadingLabel,
  confirmVariant = 'danger',
}: ConfirmDialogProps) {
  const iconBg = confirmVariant === 'primary' ? 'bg-primary/10' : 'bg-danger/10'
  const iconColor = confirmVariant === 'primary' ? 'text-primary' : 'text-danger'
  const fallbackLoading = confirmLabel === 'Excluir' ? 'Excluindo...' : `${confirmLabel}...`
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mb-4`}>
          <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
        </div>
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} className="flex-1" disabled={loading}>
            {loading ? (loadingLabel ?? fallbackLoading) : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
