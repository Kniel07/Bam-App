import type { MoodKind } from '@/lib/supabase/database.types'

/** Mood options (CR-06 #2), in display order. */
export const MOODS: { kind: MoodKind; emoji: string; label: string }[] = [
  { kind: 'happy', emoji: '😊', label: 'happy' },
  { kind: 'loving', emoji: '🥰', label: 'loving' },
  { kind: 'excited', emoji: '🤩', label: 'excited' },
  { kind: 'missing', emoji: '🥺', label: 'missing you' },
  { kind: 'sleepy', emoji: '😴', label: 'sleepy' },
  { kind: 'stressed', emoji: '😵‍💫', label: 'stressed' },
  { kind: 'sad', emoji: '😢', label: 'sad' },
  { kind: 'grumpy', emoji: '😤', label: 'grumpy' },
]

export function moodInfo(kind: MoodKind) {
  return MOODS.find((mood) => mood.kind === kind) ?? { kind, emoji: '💭', label: kind }
}
