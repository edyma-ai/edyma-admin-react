import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_ANIMATION_MS, axisTickStyle, chartColor, gridStroke } from '@/components/charts/palette'
import { ChartLegend, ChartShell } from '@/components/charts/ChartShell'
import { ChartTooltipContent } from '@/components/charts/ChartTooltip'

export interface BarSeries {
  key: string
  label: string
  color?: string
}

export interface BarsProps {
  data: Record<string, unknown>[]
  xKey: string
  series: BarSeries[]
  stacked?: boolean
  height?: number
  valueFormatter?: (value: number) => string
  emptyLabel?: string
  className?: string
}

/** Vertical bars — thin marks, rounded data-ends, 2px surface gap between stacked segments. */
export function Bars({ data, xKey, series, stacked = false, height, valueFormatter, emptyLabel, className }: BarsProps) {
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
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey={xKey} tick={axisTickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} minTickGap={16} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'var(--sky-soft)', opacity: 0.5 }}
          content={<ChartTooltipContent valueFormatter={valueFormatter} />}
          isAnimationActive={false}
        />
        {series.map((entry, index) => {
          const isTop = index === series.length - 1
          return (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.label}
              stackId={stacked ? 'stack' : undefined}
              fill={entry.color ?? chartColor(index)}
              maxBarSize={28}
              radius={!stacked || isTop ? [4, 4, 0, 0] : 0}
              stroke="var(--surface)"
              strokeWidth={stacked ? 1 : 0}
              animationDuration={CHART_ANIMATION_MS}
            />
          )
        })}
      </BarChart>
    </ChartShell>
  )
}
