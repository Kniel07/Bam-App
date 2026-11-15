import { instantToZonedWallTime } from '@/lib/dates/monthsary'
import type { Milestone } from './api'

export type TimelineEntry = { kind: 'anchor'; date: string } | { kind: 'milestone'; milestone: Milestone }

/**
 * Places the anchor ("the day it all began") in chronological order among the
 * milestones. Milestones often come before it (the day we met, a first date);
 * milestones on the anchor's own day follow it.
 */
export function buildTimeline(milestones: Milestone[], anchorStartAt: string | null, timeZone: string): TimelineEntry[] {
  const entries: TimelineEntry[] = milestones.map((milestone) => ({ kind: 'milestone', milestone }))
  if (!anchorStartAt) return entries
  const anchorDate = instantToZonedWallTime(new Date(anchorStartAt), timeZone).date
  const index = milestones.findIndex((milestone) => milestone.occurred_on >= anchorDate)
  const anchor: TimelineEntry = { kind: 'anchor', date: anchorDate }
  if (index === -1) return [...entries, anchor]
  return [...entries.slice(0, index), anchor, ...entries.slice(index)]
}
