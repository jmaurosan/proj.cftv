import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  subtitle?: string
  icon: LucideIcon
  color?: string
}

export default function StatCard({ label, value, subtitle, icon: Icon, color = 'text-accent' }: StatCardProps) {
  return (
    <div className="bg-bg-secondary border border-border-light rounded-xl p-5 hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm">{label}</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
          {subtitle && <p className="text-text-muted text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-bg-tertiary/50 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
