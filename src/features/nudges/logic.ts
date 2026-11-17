import type { Nudge } from './api'

const DAY = 24 * 3_600_000

export interface NudgeSummary {
  /** Latest nudge from the other person within the last 24 hours. */
  latestReceived: Nudge | null
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
  return { latestReceived, sentThisWeek, receivedThisWeek }
}

/** "just now", "5 min ago", "3 h ago". */
export function timeAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} h ago`
}
