import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-bg-secondary border border-border-light rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}
