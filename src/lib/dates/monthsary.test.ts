/**
 * DR-01…DR-05. Test anchors are synthetic dates, never the real relationship's.
 */
import {
  calculateRelationshipDuration,
  countMonthsariesReached,
  getMonthsary,
  getMonthsaryToday,
  getNextMonthsary,
  instantToZonedWallTime,
  isAnniversary,
  toOrdinal,
  zonedWallTimeToInstant,
} from './monthsary'

const TOKYO = 'Asia/Tokyo' // UTC+9, no DST
const NEW_YORK = 'America/New_York' // DST

/** Instant from a wall-clock time in a zone, e.g. at('2025-01-31 00:30', TOKYO). */
function at(wallTime: string, timeZone: string): Date {
  const [date = '', time = ''] = wallTime.split(' ')
  return zonedWallTimeToInstant(date, time, timeZone)
}
function wall(instant: Date, timeZone: string): string {
  const { date, time } = instantToZonedWallTime(instant, timeZone)
  return `${date} ${time}`
}

describe('getMonthsary (DR-01)', () => {
  it('keeps the same day and wall-clock minute for ordinary dates', () => {
    const start = at('2025-03-10 00:35', TOKYO)
    expect(wall(getMonthsary(start, 1, TOKYO), TOKYO)).toBe('2025-04-10 00:35')
    expect(wall(getMonthsary(start, 12, TOKYO), TOKYO)).toBe('2026-03-10 00:35')
  })

  it('n = 0 is the anchor itself', () => {
    const start = at('2025-03-10 00:35', TOKYO)
    expect(getMonthsary(start, 0, TOKYO).getTime()).toBe(start.getTime())
  })

  it('falls on the last day of shorter months', () => {
    const start = at('2025-01-31 00:30', TOKYO)
    expect(wall(getMonthsary(start, 1, TOKYO), TOKYO)).toBe('2025-02-28 00:30')
    expect(wall(getMonthsary(start, 3, TOKYO), TOKYO)).toBe('2025-04-30 00:30')
  })

  it('never drifts: computed from the anchor, not the previous monthsary', () => {
    const start = at('2025-01-31 00:30', TOKYO)
    expect(wall(getMonthsary(start, 2, TOKYO), TOKYO)).toBe('2025-03-31 00:30')
    expect(wall(getMonthsary(start, 4, TOKYO), TOKYO)).toBe('2025-05-31 00:30')
  })

  it('handles leap years for a 31st and for a leap-day anchor', () => {
    expect(wall(getMonthsary(at('2024-01-31 09:00', TOKYO), 1, TOKYO), TOKYO)).toBe('2024-02-29 09:00')
    const leapDay = at('2024-02-29 09:00', TOKYO)
    expect(wall(getMonthsary(leapDay, 12, TOKYO), TOKYO)).toBe('2025-02-28 09:00')
    expect(wall(getMonthsary(leapDay, 48, TOKYO), TOKYO)).toBe('2028-02-29 09:00')
  })

  it('moves a time inside a DST spring-forward gap forward by the gap', () => {
    const start = at('2025-02-09 02:30', NEW_YORK)
    expect(wall(getMonthsary(start, 1, NEW_YORK), NEW_YORK)).toBe('2025-03-09 03:30')
  })

  it('rejects negative or fractional numbers', () => {
    const start = at('2025-01-01 00:00', TOKYO)
    expect(() => getMonthsary(start, -1, TOKYO)).toThrow(RangeError)
    expect(() => getMonthsary(start, 1.5, TOKYO)).toThrow(RangeError)
  })

  it('is independent of the device timezone (uses the relationship zone)', () => {
    // Same instant, interpreted in two zones, yields different calendar days.
    const instant = new Date('2025-01-31T16:00:00Z') // Feb 1 01:00 in Tokyo, Jan 31 11:00 in NY
    expect(wall(getMonthsary(instant, 1, TOKYO), TOKYO)).toBe('2025-03-01 01:00')
    expect(wall(getMonthsary(instant, 1, NEW_YORK), NEW_YORK)).toBe('2025-02-28 11:00')
  })
})

describe('countMonthsariesReached', () => {
  const start = at('2025-03-10 00:35', TOKYO)
  it('is 0 before the anchor and before the first monthsary', () => {
    expect(countMonthsariesReached(start, at('2025-03-01 00:00', TOKYO), TOKYO)).toBe(0)
    expect(countMonthsariesReached(start, at('2025-04-10 00:34', TOKYO), TOKYO)).toBe(0)
  })
  it('ticks over at the exact anchor minute', () => {
    expect(countMonthsariesReached(start, at('2025-04-10 00:35', TOKYO), TOKYO)).toBe(1)
  })
})

describe('calculateRelationshipDuration (DR-02)', () => {
  it('is all zeros at or before the anchor', () => {
    const start = at('2025-03-10 00:35', TOKYO)
    expect(calculateRelationshipDuration(start, start, TOKYO)).toEqual({
      years: 0, months: 0, days: 0, hours: 0, minutes: 0, totalMonths: 0,
    })
    expect(calculateRelationshipDuration(start, at('2025-01-01 00:00', TOKYO), TOKYO).totalMonths).toBe(0)
  })

  it('breaks down a simple duration', () => {
    const start = at('2025-03-10 00:35', TOKYO)
    expect(calculateRelationshipDuration(start, at('2025-03-17 15:02', TOKYO), TOKYO)).toEqual({
      years: 0, months: 0, days: 7, hours: 14, minutes: 27, totalMonths: 0,
    })
  })

  it('counts days from the clamped month-end monthsary', () => {
    const start = at('2025-01-31 00:30', TOKYO)
    expect(calculateRelationshipDuration(start, at('2025-03-01 12:45', TOKYO), TOKYO)).toEqual({
      years: 0, months: 1, days: 1, hours: 12, minutes: 15, totalMonths: 1,
    })
  })

  it('rolls months into years', () => {
    const start = at('2025-03-10 00:35', TOKYO)
    expect(calculateRelationshipDuration(start, at('2026-05-12 01:00', TOKYO), TOKYO)).toEqual({
      years: 1, months: 2, days: 2, hours: 0, minutes: 25, totalMonths: 14,
    })
  })

  it('shows exactly one month at the first monthsary minute, not 30/31 days', () => {
    const start = at('2025-03-10 00:35', TOKYO)
    expect(calculateRelationshipDuration(start, at('2025-04-10 00:35', TOKYO), TOKYO)).toEqual({
      years: 0, months: 1, days: 0, hours: 0, minutes: 0, totalMonths: 1,
    })
  })

  it('treats a 25-hour DST fall-back day as one calendar day', () => {
    const start = at('2025-10-15 12:00', NEW_YORK)
    // Nov 2 2025 has 25 hours in New York.
    const result = calculateRelationshipDuration(start, at('2025-11-03 12:00', NEW_YORK), NEW_YORK)
    expect(result).toMatchObject({ months: 0, days: 19, hours: 0, minutes: 0 })
  })
})

describe('getNextMonthsary', () => {
  const start = at('2025-03-10 00:35', TOKYO)
  it('is the first monthsary before it arrives', () => {
    const next = getNextMonthsary(start, at('2025-03-20 08:00', TOKYO), TOKYO)
    expect(next.number).toBe(1)
    expect(wall(next.at, TOKYO)).toBe('2025-04-10 00:35')
  })
  it('advances immediately at the monthsary minute', () => {
    const next = getNextMonthsary(start, at('2025-04-10 00:35', TOKYO), TOKYO)
    expect(next.number).toBe(2)
    expect(wall(next.at, TOKYO)).toBe('2025-05-10 00:35')
  })
  it('is the first monthsary even before the anchor', () => {
    expect(getNextMonthsary(start, at('2025-01-01 00:00', TOKYO), TOKYO).number).toBe(1)
  })
})

describe('getMonthsaryToday', () => {
  const start = at('2025-03-10 00:35', TOKYO)
  it('is null before the moment on the day itself', () => {
    expect(getMonthsaryToday(start, at('2025-04-10 00:30', TOKYO), TOKYO)).toBeNull()
  })
  it('celebrates from the exact minute to the end of that calendar day', () => {
    expect(getMonthsaryToday(start, at('2025-04-10 00:35', TOKYO), TOKYO)?.number).toBe(1)
    expect(getMonthsaryToday(start, at('2025-04-10 23:59', TOKYO), TOKYO)?.number).toBe(1)
  })
  it('stops the next day', () => {
    expect(getMonthsaryToday(start, at('2025-04-11 00:00', TOKYO), TOKYO)).toBeNull()
  })
  it('never celebrates the anchor day itself as a monthsary', () => {
    expect(getMonthsaryToday(start, at('2025-03-10 12:00', TOKYO), TOKYO)).toBeNull()
  })
})

describe('helpers', () => {
  it('formats ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(toOrdinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th',
    ])
  })
  it('recognizes anniversaries', () => {
    expect(isAnniversary(12)).toBe(true)
    expect(isAnniversary(24)).toBe(true)
    expect(isAnniversary(0)).toBe(false)
    expect(isAnniversary(13)).toBe(false)
  })
  it('round-trips wall-clock time through an instant', () => {
    const instant = zonedWallTimeToInstant('2025-03-10', '00:35', TOKYO)
    expect(instant.toISOString()).toBe('2025-03-09T15:35:00.000Z')
    expect(instantToZonedWallTime(instant, TOKYO)).toEqual({ date: '2025-03-10', time: '00:35' })
  })
  it('rejects malformed wall-clock input', () => {
    expect(() => zonedWallTimeToInstant('2025/03/10', '00:35', TOKYO)).toThrow(RangeError)
    expect(() => zonedWallTimeToInstant('2025-03-10', '0:47', TOKYO)).toThrow(RangeError)
  })
})
