import type { NudgeKind } from '@/lib/supabase/database.types'

/** Fixed phrases (CR-05). Shown in the app and, word for word, in notifications. */
export const NUDGES: Record<NudgeKind, { emoji: string; label: string; received: (name: string) => string }> = {
  miss_you: { emoji: '💗', label: 'I MISS YOU', received: (name) => `${name} misses you` },
  thinking_of_you: { emoji: '💭', label: 'Thinking of you', received: (name) => `${name} is thinking of you` },
  hug: { emoji: '🤗', label: 'Sending a hug', received: (name) => `${name} sent you a hug` },
  good_night: { emoji: '🌙', label: 'Good night', received: (name) => `${name} says good night` },
}

export const SECONDARY_NUDGES: NudgeKind[] = ['thinking_of_you', 'hug', 'good_night']
