import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { scoreBand } from '@/lib/format'
import { CHART_ANIMATION_MS, axisTickStyle, bandColor, gridStroke } from '@/components/charts/palette'
import { ChartShell } from '@/components/charts/ChartShell'
import { ChartTooltipContent } from '@/components/charts/ChartTooltip'

export interface ScoreBucket {
  /** Bucket label, e.g. '0-19' … '80-100' — the leading number picks the band color. */
  range: string
  count: number
}

export interface ScoreDistributionProps {
  data: ScoreBucket[]
  height?: number
  emptyLabel?: string
  className?: string
}

/** Score histogram colored on the 4-band scale (≥80 green · ≥60 blue · ≥40 amber · <40 red). */
export function ScoreDistribution({ data, height, emptyLabel, className }: ScoreDistributionProps) {
  const hasCounts = data.some((bucket) => bucket.count > 0)

  return (
    <ChartShell height={height} empty={!hasCounts} emptyLabel={emptyLabel} className={className}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="range" tick={axisTickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'var(--sky-soft)', opacity: 0.5 }} content={<ChartTooltipContent />} isAnimationActive={false} />
        <Bar dataKey="count" name="Evaluations" maxBarSize={40} radius={[4, 4, 0, 0]} animationDuration={CHART_ANIMATION_MS}>
          {data.map((bucket) => (
            <Cell key={bucket.range} fill={bandColor[scoreBand(parseInt(bucket.range, 10) || 0)]} />
          ))}
        </Bar>
      </BarChart>
    </ChartShell>
  )
}
