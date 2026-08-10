import { QueryClient } from '@tanstack/react-query'

/**
 * Dashboard-tuned defaults: widgets share caches keyed by (school_id, range),
 * stay fresh for ~30s, and heavy analytics never refetch just because the
 * window regained focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
