import type { Nudge } from './api'

const DAY = 24 * 3_600_000

export interface NudgeSummary {
  /** Latest nudge from the other person within the last 24 hours. */
  latestReceived: Nudge | null
  /** When you both pressed "I miss you" within 60 s of each other (last 24 h). */
  togetherAt: string | null
  sentThisWeek: number
  receivedThisWeek: number
}

export function summarizeNudges(nudges: Nudge[], myUserId: string | null, now: Date): NudgeSummary {
  const weekAgo = now.getTime() - 7 * DAY
  const dayAgo = now.getTime() - DAY
  let latestReceived: Nudge | null = null
  let sentThisWeek = 0
  let receivedThisWeek = 0
  for (const nudge of nudges) {
    const at = new Date(nudge.created_at).getTime()
    if (at < weekAgo) continue
    if (nudge.sender_id === myUserId) {
      sentThisWeek += 1
    } else {
      receivedThisWeek += 1
      if (at >= dayAgo && (!latestReceived || at > new Date(latestReceived.created_at).getTime())) latestReceived = nudge
    }
  }
  return { latestReceived, togetherAt: findTogetherMoment(nudges, now), sentThisWeek, receivedThisWeek }
}

const SAME_MOMENT_MS = 60_000

/**
 * Same-moment magic (CR-06 #1): the latest "I miss you" that the other person
 * also pressed within 60 seconds. Mirrors N6 in the database.
 */
export function findTogetherMoment(nudges: Nudge[], now: Date): string | null {
  const recent = nudges
    .filter((nudge) => nudge.kind === 'miss_you' && now.getTime() - new Date(nudge.created_at).getTime() < DAY)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  for (const later of recent) {
    const laterAt = new Date(later.created_at).getTime()
    const match = recent.find((earlier) => {
      const earlierAt = new Date(earlier.created_at).getTime()
      return earlier.sender_id !== later.sender_id && earlier.id !== later.id && earlierAt <= laterAt && laterAt - earlierAt < SAME_MOMENT_MS
    })
    if (match) return later.created_at
  }
  return null
}

/** "just now", "5 min ago", "3 h ago". */
export function timeAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} h ago`
}
