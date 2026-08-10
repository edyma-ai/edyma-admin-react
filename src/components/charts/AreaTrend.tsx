import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_ANIMATION_MS, axisTickStyle, chartColor, gridStroke } from '@/components/charts/palette'
import { ChartLegend, ChartShell } from '@/components/charts/ChartShell'
import { ChartTooltipContent } from '@/components/charts/ChartTooltip'

export interface TrendSeries {
  key: string
  label: string
  color?: string
  /** 'right' plots the series on a secondary axis — for pairs whose scales would flatten each other. */
  yAxisId?: 'left' | 'right'
}

export interface AreaTrendProps {
  data: Record<string, unknown>[]
  xKey: string
  series: TrendSeries[]
  height?: number
  valueFormatter?: (value: number) => string
  emptyLabel?: string
  className?: string
}

/** Time-trend area chart — soft gradient fill, 2px line, mono ticks. */
export function AreaTrend({ data, xKey, series, height, valueFormatter, emptyLabel, className }: AreaTrendProps) {
  const gradientId = useId()
  const hasRightAxis = series.some((entry) => entry.yAxisId === 'right')

  return (
    <ChartShell
      height={height}
      empty={data.length === 0}
      emptyLabel={emptyLabel}
      className={className}
      legend={
        series.length > 1 ? (
          <ChartLegend items={series.map((entry, index) => ({ label: entry.label, color: entry.color ?? chartColor(index) }))} />
        ) : undefined
      }
    >
      <AreaChart data={data} margin={{ top: 8, right: hasRightAxis ? -12 : 8, bottom: 0, left: -12 }}>
        <defs>
          {series.map((entry, index) => {
            const color = entry.color ?? chartColor(index)
            return (
              <linearGradient key={entry.key} id={`${gradientId}-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey={xKey} tick={axisTickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} minTickGap={24} />
        <YAxis yAxisId="left" tick={axisTickStyle} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
        {hasRightAxis ? (
          <YAxis yAxisId="right" orientation="right" tick={axisTickStyle} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
        ) : null}
        <Tooltip
          cursor={{ stroke: gridStroke }}
          content={<ChartTooltipContent valueFormatter={valueFormatter} />}
          isAnimationActive={false}
        />
        {series.map((entry, index) => {
          const color = entry.color ?? chartColor(index)
          return (
            <Area
              key={entry.key}
              yAxisId={entry.yAxisId ?? 'left'}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId}-${entry.key})`}
              animationDuration={CHART_ANIMATION_MS}
              // A single point draws no line segment — the dot is the only visible mark.
              dot={data.length === 1 ? { r: 3.5, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            />
          )
        })}
      </AreaChart>
    </ChartShell>
  )
}
