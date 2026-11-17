import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { NudgeKind } from '@/lib/supabase/database.types'
import { fetchRecentNudges, sendNudge } from './api'

export const nudgeKeys = { recent: ['nudges', 'recent'] as const }

/** Recent nudges, kept live while the app is open (Supabase Realtime, RLS-filtered). */
export function useRecentNudges() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('nudges-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nudges' }, () => {
        void queryClient.invalidateQueries({ queryKey: nudgeKeys.recent })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({ queryKey: nudgeKeys.recent, queryFn: fetchRecentNudges, refetchInterval: 60_000 })
}

export function useSendNudge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, hugSeconds }: { kind: NudgeKind; hugSeconds?: number }) => sendNudge(kind, hugSeconds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nudgeKeys.recent }),
  })
}
