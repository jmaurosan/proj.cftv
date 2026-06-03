import type { LucideIcon } from 'lucide-react'
import { PackageOpen } from 'lucide-react'

interface EmptyStateProps {
  message: string
  icon?: LucideIcon
}

export default function EmptyState({ message, icon: Icon = PackageOpen }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-muted">
      <Icon className="w-12 h-12 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
