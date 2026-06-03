import { STATUS_COLORS } from '../../lib/constants'

interface BadgeProps {
  status: string
  label?: string
}

export default function Badge({ status, label }: BadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-bg-tertiary text-text-secondary'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
