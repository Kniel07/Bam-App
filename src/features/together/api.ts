import { supabase } from '@/lib/supabase/client'
import type { MoodKind, Tables } from '@/lib/supabase/database.types'
import { ApiError } from '@/features/relationship/api'
import { pokeNotifier } from '@/features/nudges/api'

export type Mood = Tables<'moods'>
export type Countdown = Tables<'countdowns'>

export class TooSoonError extends Error {
  constructor() {
    super('Too soon')
    this.name = 'TooSoonError'
  }
}

/** Latest check-in per person (last 7 days is plenty). */
export async function fetchRecentMoods(): Promise<Mood[]> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new ApiError('Could not load moods', error)
  return data
}

export async function shareMood(mood: MoodKind, note: string): Promise<void> {
  const trimmed = note.trim()
  const { error } = await supabase.from('moods').insert({ mood, note: trimmed ? trimmed.slice(0, 80) : null })
  if (error) {
    if (error.message.includes('mood_too_soon')) throw new TooSoonError()
    throw new ApiError('Could not share your mood', error)
  }
  pokeNotifier()
}

export async function fetchCountdowns(): Promise<Countdown[]> {
  const { data, error } = await supabase.from('countdowns').select('*').order('target_at', { ascending: true })
  if (error) throw new ApiError('Could not load countdowns', error)
  return data
}

export async function saveCountdown(input: { id?: string; title: string; targetAt: string }): Promise<void> {
  const row = { title: input.title.trim(), target_at: input.targetAt }
  const { error } = input.id
    ? await supabase.from('countdowns').update(row).eq('id', input.id)
    : await supabase.from('countdowns').insert(row)
  if (error) throw new ApiError('Could not save the countdown', error)
}

export async function deleteCountdown(id: string): Promise<void> {
  const { error } = await supabase.from('countdowns').delete().eq('id', id)
  if (error) throw new ApiError('Could not delete the countdown', error)
}
