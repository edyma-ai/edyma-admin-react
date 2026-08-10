import type { ReactNode } from 'react'
import { SectionCard } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage } from '@/lib/apiError'

/** The slice of a TanStack query a widget needs — keeps widgets hook-agnostic. */
export interface WidgetQuery<T> {
  data: T | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

export interface WidgetProps<T> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  query: WidgetQuery<T>
  /** Height of the loading shimmer — match the loaded body to avoid layout jumps. */
  skeletonHeight?: number
  className?: string
  children: (data: T) => ReactNode
}

/** SectionCard that owns the loading / error / loaded states of one query, so pages render progressively. */
export function Widget<T>({ title, description, actions, query, skeletonHeight = 240, className, children }: WidgetProps<T>) {
  return (
    <SectionCard title={title} description={description} actions={actions} className={className}>
      {query.isPending ? (
        <div style={{ height: skeletonHeight }}>
          <Skeleton className="h-full w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState message={apiErrorMessage(query.error)} onRetry={query.refetch} />
      ) : query.data !== undefined ? (
        children(query.data)
      ) : null}
    </SectionCard>
  )
}
