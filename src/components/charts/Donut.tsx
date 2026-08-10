import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { CHART_ANIMATION_MS, chartColor } from '@/components/charts/palette'
import { ChartLegend, ChartShell } from '@/components/charts/ChartShell'
import { ChartTooltipContent } from '@/components/charts/ChartTooltip'

export interface DonutSlice {
  name: string
  value: number
  color?: string
}

export interface DonutProps {
  data: DonutSlice[]
  height?: number
  /** Headline shown in the donut hole, e.g. the total. */
  centerLabel?: string
  centerCaption?: string
  valueFormatter?: (value: number) => string
  emptyLabel?: string
  className?: string
}

export function Donut({ data, height = 220, centerLabel, centerCaption, valueFormatter, emptyLabel, className }: DonutProps) {
  const slices = data.filter((slice) => slice.value > 0)

  return (
    <ChartShell
      height={height}
      empty={slices.length === 0}
      emptyLabel={emptyLabel}
      className={className}
      legend={<ChartLegend items={slices.map((slice, index) => ({ label: slice.name, color: slice.color ?? chartColor(index) }))} />}
    >
      <PieChart>
        <Tooltip content={<ChartTooltipContent valueFormatter={valueFormatter} />} isAnimationActive={false} />
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="88%"
          paddingAngle={2}
          stroke="var(--surface)"
          strokeWidth={2}
          animationDuration={CHART_ANIMATION_MS}
        >
          {slices.map((slice, index) => (
            <Cell key={slice.name} fill={slice.color ?? chartColor(index)} />
          ))}
        </Pie>
        {centerLabel ? (
          <>
            <text
              x="50%"
              y={centerCaption ? '46%' : '50%'}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, fill: 'var(--ink)' }}
            >
              {centerLabel}
            </text>
            {centerCaption ? (
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fill: 'var(--muted)' }}
              >
                {centerCaption}
              </text>
            ) : null}
          </>
        ) : null}
      </PieChart>
    </ChartShell>
  )
}
