import { supabase } from '@/lib/supabase/client'
import type { NudgeKind, Tables } from '@/lib/supabase/database.types'
import { ApiError } from '@/features/relationship/api'

export type Nudge = Tables<'nudges'>

export class NudgeTooSoonError extends Error {
  constructor() {
    super('Same nudge sent a moment ago')
    this.name = 'NudgeTooSoonError'
  }
}

/** Nudges from the last 7 days (enough for "latest" and the weekly tally). */
export async function fetchRecentNudges(): Promise<Nudge[]> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()
  const { data, error } = await supabase
    .from('nudges')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new ApiError('Could not load nudges', error)
  return data
}

/**
 * Sends a nudge (sender and time are set by the database), then asks the
 * notifier to deliver it now. If that call fails, the every-minute schedule
 * delivers it anyway, so it is fire-and-forget.
 */
export async function sendNudge(kind: NudgeKind, hugSeconds?: number): Promise<void> {
  const { error } = await supabase
    .from('nudges')
    .insert(kind === 'hug' && hugSeconds ? { kind, hug_seconds: Math.min(30, Math.max(1, Math.round(hugSeconds))) } : { kind })
  if (error) {
    if (error.message.includes('nudge_too_soon')) throw new NudgeTooSoonError()
    throw new ApiError('Could not send the nudge', error)
  }
  pokeNotifier()
}

/** Ask the notifier to deliver now; the every-minute schedule is the fallback. */
export function pokeNotifier(): void {
  void supabase.functions.invoke('notify', { body: {} }).catch(() => undefined)
}
