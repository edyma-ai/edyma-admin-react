import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { CHART_ANIMATION_MS } from '@/components/charts/palette'

export interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

/** Bare trend line for StatTile slots — no axes, no grid, no tooltip. */
export function Sparkline({ data, color = 'var(--sky)', height = 36 }: SparklineProps) {
  const gradientId = useId()
  if (data.length < 2) return null

  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((value, index) => ({ index, value }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            animationDuration={CHART_ANIMATION_MS}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
