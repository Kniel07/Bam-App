import { formatCountdown } from './formatCountdown'

const now = new Date('2025-01-01T00:00:00Z')
const later = (ms: number) => new Date(now.getTime() + ms)
const MINUTE = 60_000
const HOUR = 60 * MINUTE

describe('formatCountdown', () => {
  it('says "any moment now" in the last minute and after the target', () => {
    expect(formatCountdown(later(30_000), now)).toBe('any moment now')
    expect(formatCountdown(later(-5 * MINUTE), now)).toBe('any moment now')
  })
  it('counts minutes under an hour', () => {
    expect(formatCountdown(later(7 * MINUTE), now)).toBe('in 7 minutes')
  })
  it('counts hours and minutes under two days', () => {
    expect(formatCountdown(later(4 * HOUR + 12 * MINUTE), now)).toBe('in 4 h 12 m')
    expect(formatCountdown(later(47 * HOUR), now)).toBe('in 47 h 0 m')
  })
  it('counts whole days from two days out', () => {
    expect(formatCountdown(later(48 * HOUR), now)).toBe('in 2 days')
    expect(formatCountdown(later(24 * 24 * HOUR + 5 * HOUR), now)).toBe('in 24 days')
  })
})
