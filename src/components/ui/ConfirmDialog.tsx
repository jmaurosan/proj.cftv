import { AlertTriangle } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading?: boolean
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
