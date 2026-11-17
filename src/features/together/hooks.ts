import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { MoodKind } from '@/lib/supabase/database.types'
import { deleteCountdown, fetchCountdowns, fetchRecentMoods, saveCountdown, shareMood } from './api'

export const togetherKeys = {
  moods: ['together', 'moods'] as const,
  countdowns: ['together', 'countdowns'] as const,
}

/** Live refresh while the app is open (Realtime; RLS applies). */
function useLiveTable(table: 'moods' | 'countdowns', queryKey: readonly string[]) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-live`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void queryClient.invalidateQueries({ queryKey })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, table, queryKey])
}

export function useRecentMoods() {
  useLiveTable('moods', togetherKeys.moods)
  return useQuery({ queryKey: togetherKeys.moods, queryFn: fetchRecentMoods, refetchInterval: 120_000 })
}

export function useShareMood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mood, note }: { mood: MoodKind; note: string }) => shareMood(mood, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: togetherKeys.moods }),
  })
}

export function useCountdowns() {
  useLiveTable('countdowns', togetherKeys.countdowns)
  return useQuery({ queryKey: togetherKeys.countdowns, queryFn: fetchCountdowns })
}

export function useSaveCountdown() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveCountdown,
    onSettled: () => queryClient.invalidateQueries({ queryKey: togetherKeys.countdowns }),
  })
}

export function useDeleteCountdown() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCountdown,
    onSettled: () => queryClient.invalidateQueries({ queryKey: togetherKeys.countdowns }),
  })
}
