import type { NudgeKind } from '@/lib/supabase/database.types'

/** Fixed phrases (CR-05). Shown in the app and, word for word, in notifications. */
export const NUDGES: Record<NudgeKind, { emoji: string; label: string; received: (name: string) => string }> = {
  miss_you: { emoji: '💗', label: 'I MISS YOU', received: (name) => `${name} misses you` },
  thinking_of_you: { emoji: '💭', label: 'Thinking of you', received: (name) => `${name} is thinking of you` },
  hug: { emoji: '🤗', label: 'Hold to hug', received: (name) => `${name} sent you a hug` },
  good_night: { emoji: '🌙', label: 'Good night', received: (name) => `${name} says good night` },
}

/** Tap nudges under the heart (hugs have their own hold button). */
export const SECONDARY_NUDGES: NudgeKind[] = ['thinking_of_you', 'good_night']

/** Longest hug a single hold can send (the database allows up to 30 s). */
export const MAX_HUG_SECONDS = 15
