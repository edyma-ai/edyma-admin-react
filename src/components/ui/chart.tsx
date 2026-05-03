import * as React from 'react'
import { Tooltip } from 'recharts'
import { cn } from '@/lib/cn'

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<'light' | 'dark', string>
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used within a ChartContainer')
  return ctx
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactElement
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, children, className, ...props }, ref) => {
    const cssVars = Object.entries(config).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value.color) {
          acc[`--color-${key}`] = value.color
        }
        return acc
      },
      {},
    )

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          data-chart
          className={cn(
            '[&_.recharts-cartesian-axis-tick_text]:fill-muted [&_.recharts-cartesian-grid_line]:stroke-border/50',
            '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
            '[&_.recharts-polar-grid_[stroke]]:stroke-border',
            '[&_.recharts-radial-bar-background-sector]:fill-muted',
            '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/10',
            '[&_.recharts-reference-line_[stroke]]:stroke-border',
            'flex aspect-video justify-center text-xs',
            className,
          )}
          style={cssVars as React.CSSProperties}
          {...props}
        >
          <div className="w-full [&_.recharts-responsive-container]:h-full [&_.recharts-responsive-container]:w-full">
            {children}
          </div>
        </div>
      </ChartContext.Provider>
    )
  },
)
ChartContainer.displayName = 'ChartContainer'

const ChartTooltip = Tooltip

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number
    dataKey?: string
    color?: string
    payload?: Record<string, unknown>
    fill?: string
  }>
  label?: string
  labelFormatter?: (label: string, payload: unknown[]) => React.ReactNode
  nameKey?: string
  labelKey?: string
  indicator?: 'line' | 'dot' | 'dashed'
  hideLabel?: boolean
  hideIndicator?: boolean
  formatter?: (
    value: number,
    name: string,
    item: unknown,
    index: number,
    payload: unknown,
  ) => React.ReactNode
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelKey,
      nameKey,
      formatter,
    },
    ref,
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) return null

    const tooltipLabel = hideLabel
      ? null
      : labelFormatter
        ? labelFormatter(label ?? '', payload)
        : (labelKey
          ? config[labelKey]?.label ?? label
          : label)

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-32 items-start gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs shadow-xl',
          className,
        )}
      >
        {tooltipLabel ? (
          <div className="font-medium text-brand-slate">{tooltipLabel}</div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = (nameKey ? item.payload?.[nameKey] : item.dataKey ?? item.name) as string
            const itemConfig = config[key] ?? {}
            const indicatorColor = item.color ?? item.fill ?? itemConfig.color ?? 'var(--color-border)'

            return (
              <div
                key={`${key}-${index}`}
                className="flex w-full flex-wrap items-center gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted"
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                      indicator === 'dot' && 'h-2.5 w-2.5 rounded-full',
                      indicator === 'line' && 'w-1 h-4',
                      indicator === 'dashed' && 'w-0 border-[1.5px] border-dashed bg-transparent h-4',
                    )}
                    style={
                      {
                        '--color-bg': indicatorColor,
                        '--color-border': indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div className="flex flex-1 items-baseline justify-between gap-4 leading-none">
                  <div className="text-muted">
                    {itemConfig?.icon ? <itemConfig.icon /> : null}
                    <span>{itemConfig?.label ?? key}</span>
                  </div>
                  <span className="font-mono font-medium tabular-nums text-brand-slate">
                    {formatter
                      ? formatter(item.value ?? 0, key, item, index, payload)
                      : (item.value?.toLocaleString() ?? '0')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

export { ChartContainer, ChartTooltip, ChartTooltipContent, useChart }
