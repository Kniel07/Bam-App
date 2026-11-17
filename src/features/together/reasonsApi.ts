import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import { ApiError } from '@/features/relationship/api'
import { pokeNotifier } from '@/features/nudges/api'

export type Reason = Tables<'love_reasons'>

export async function fetchReasons(): Promise<Reason[]> {
  const { data, error } = await supabase.from('love_reasons').select('*').order('number', { ascending: true })
  if (error) throw new ApiError('Could not load reasons', error)
  return data
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from('reason_favorites').select('reason_id')
  if (error) throw new ApiError('Could not load favorites', error)
  return data.map((row) => row.reason_id)
}

export async function saveReason(body: string, id?: string): Promise<void> {
  const text = body.trim()
  const { error } = id
    ? await supabase.from('love_reasons').update({ body: text }).eq('id', id)
    : await supabase.from('love_reasons').insert({ body: text })
  if (error) throw new ApiError('Could not save the reason', error)
  if (!id) pokeNotifier()
}

export async function deleteReason(id: string): Promise<void> {
  const { error } = await supabase.from('love_reasons').delete().eq('id', id)
  if (error) throw new ApiError('Could not delete the reason', error)
}

export async function setFavorite(reasonId: string, isFavorite: boolean): Promise<void> {
  const { error } = isFavorite
    ? await supabase.from('reason_favorites').insert({ reason_id: reasonId })
    : await supabase.from('reason_favorites').delete().eq('reason_id', reasonId)
  if (error) throw new ApiError('Could not update favorite', error)
}

/** Random reason, avoiding the one just shown when there's a choice. */
export function pickRandomReason(reasons: Reason[], previousId: string | null, random: () => number = Math.random): Reason | null {
  if (reasons.length === 0) return null
  const pool = reasons.length > 1 ? reasons.filter((reason) => reason.id !== previousId) : reasons
  return pool[Math.floor(random() * pool.length)] ?? null
}

export function formatReasonNumber(number: number): string {
  return `Reason #${String(number).padStart(3, '0')}`
}
