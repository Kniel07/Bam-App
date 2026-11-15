import type { Milestone } from './api'
import { buildTimeline } from './timeline'

const m = (id: string, occurred_on: string) => ({ id, occurred_on }) as Milestone
// Anchor: 2025-03-10 00:35 in Tokyo (= 2025-03-09T15:35Z)
const ANCHOR = '2025-03-09T15:35:00Z'
const TZ = 'Asia/Tokyo'
const order = (entries: ReturnType<typeof buildTimeline>) =>
  entries.map((entry) => (entry.kind === 'anchor' ? `anchor:${entry.date}` : entry.milestone.id))

describe('buildTimeline', () => {
  it('puts earlier milestones before the anchor', () => {
    expect(order(buildTimeline([m('met', '2025-01-05'), m('date', '2025-02-14'), m('first', '2025-04-10')], ANCHOR, TZ))).toEqual([
      'met', 'date', 'anchor:2025-03-10', 'first',
    ])
  })
  it('puts milestones on the anchor day after the anchor (date in relationship timezone)', () => {
    expect(order(buildTimeline([m('same', '2025-03-10')], ANCHOR, TZ))).toEqual(['anchor:2025-03-10', 'same'])
  })
  it('handles no milestones and only-earlier milestones', () => {
    expect(order(buildTimeline([], ANCHOR, TZ))).toEqual(['anchor:2025-03-10'])
    expect(order(buildTimeline([m('met', '2025-01-05')], ANCHOR, TZ))).toEqual(['met', 'anchor:2025-03-10'])
  })
  it('omits the anchor when the relationship is not provisioned', () => {
    expect(order(buildTimeline([m('a', '2025-01-05')], null, TZ))).toEqual(['a'])
  })
})
