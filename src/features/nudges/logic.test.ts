import type { Nudge } from './api'
import { findTogetherMoment, summarizeNudges, timeAgo } from './logic'

const NOW = new Date('2025-05-10T12:00:00Z')
const ago = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()
const nudge = (sender: string, hoursAgo: number, kind: Nudge['kind'] = 'miss_you'): Nudge => ({
  id: `${sender}-${hoursAgo}`,
  sender_id: sender,
  kind,
  hug_seconds: null,
  created_at: ago(hoursAgo),
})

describe('summarizeNudges', () => {
  it('counts sent and received this week and picks the latest received within a day', () => {
    const summary = summarizeNudges(
      [nudge('me', 1), nudge('them', 2, 'hug'), nudge('them', 5), nudge('them', 30), nudge('me', 200)],
      'me',
      NOW,
    )
    expect(summary.sentThisWeek).toBe(1)
    expect(summary.receivedThisWeek).toBe(3)
    expect(summary.latestReceived?.id).toBe('them-2')
  })
  it('has no "latest" when the last one is older than a day', () => {
    expect(summarizeNudges([nudge('them', 30)], 'me', NOW).latestReceived).toBeNull()
  })
})

describe('timeAgo', () => {
  it('formats minutes and hours', () => {
    expect(timeAgo(ago(0), NOW)).toBe('just now')
    expect(timeAgo(ago(0.25), NOW)).toBe('15 min ago')
    expect(timeAgo(ago(3), NOW)).toBe('3 h ago')
  })
})

describe('findTogetherMoment (same-moment magic)', () => {
  const at = (sender: string, secondsAgo: number): Nudge => ({
    id: `${sender}-${secondsAgo}`,
    sender_id: sender,
    kind: 'miss_you',
    hug_seconds: null,
    created_at: new Date(NOW.getTime() - secondsAgo * 1000).toISOString(),
  })
  it('finds both pressing within a minute', () => {
    expect(findTogetherMoment([at('me', 100), at('them', 70)], NOW)).toBe(at('them', 70).created_at)
  })
  it('ignores presses more than a minute apart', () => {
    expect(findTogetherMoment([at('me', 200), at('them', 100)], NOW)).toBeNull()
  })
  it('ignores the same person pressing twice', () => {
    expect(findTogetherMoment([at('me', 100), at('me', 90)], NOW)).toBeNull()
  })
  it('ignores other nudge kinds', () => {
    expect(findTogetherMoment([{ ...at('me', 100), kind: 'hug' }, at('them', 90)], NOW)).toBeNull()
  })
})
