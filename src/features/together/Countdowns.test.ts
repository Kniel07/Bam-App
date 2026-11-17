import type { Countdown } from './api'
import { upcomingCountdowns } from './Countdowns'

const NOW = new Date('2025-05-10T12:00:00Z')
const cd = (id: string, target: string): Countdown => ({ id, title: id, target_at: target, created_by: 'x', created_at: '', updated_at: '' })

test('upcomingCountdowns keeps only future ones, in the order given (soonest first from the API)', () => {
  expect(upcomingCountdowns([cd('past', '2025-05-09T00:00:00Z'), cd('soon', '2025-05-11T00:00:00Z'), cd('later', '2025-06-01T00:00:00Z')], NOW).map((c) => c.id)).toEqual([
    'soon',
    'later',
  ])
  expect(upcomingCountdowns(undefined, NOW)).toEqual([])
})
