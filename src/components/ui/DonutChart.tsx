interface Segment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: Segment[]
  size?: number
  thickness?: number
  className?: string
}

export default function DonutChart({ segments, size = 160, thickness = 20, className = '' }: DonutChartProps) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (total === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-bg-tertiary/50"
          />
          <text x={center} y={center} textAnchor="middle" dominantBaseline="central" className="fill-text-muted text-sm">
            Sem dados
          </text>
        </svg>
      </div>
    )
  }

  let offset = -circumference / 4 // Start from top (12 o'clock)

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-bg-tertiary/30"
        />

        {/* Segments */}
        {segments.map((segment, i) => {
          const pct = segment.value / total
          const dash = pct * circumference
          const gap = circumference - dash
          const currentOffset = offset

          offset += dash

          if (segment.value === 0) return null

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 4px ${segment.color}40)` }}
            />
          )
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text-primary font-mono">{total}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-widest">Dispositivos</span>
      </div>
    </div>
  )
}
