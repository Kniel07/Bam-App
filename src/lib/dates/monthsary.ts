/**
 * Monthsary and relationship-duration calculations (REQUIREMENTS DR-01…DR-05).
 *
 * All calendar arithmetic happens in the relationship's IANA timezone using
 * TZDate, so results don't depend on the viewer's device timezone.
 *
 * DR-01  Monthsary n = anchor + n calendar months (same wall-clock time). If the
 *        month lacks the anchor's day, it falls on that month's last day. Always
 *        computed from the anchor, never from the previous monthsary (no drift).
 * DR-02  Duration = whole years, months (via DR-01), then whole calendar days,
 *        then hours and minutes of elapsed real time.
 * DR-05  DST: a wall-clock time that doesn't exist on a given day (spring-forward
 *        gap) moves forward by the gap; a calendar day may last 23 or 25 hours.
 */
import { TZDate } from '@date-fns/tz'
import { addDays, addMonths, differenceInCalendarDays, isSameDay } from 'date-fns'

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000

export interface RelationshipDuration {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  /** Whole months since the anchor (years × 12 + months). */
  totalMonths: number
}

export interface Monthsary {
  /** 1 = first monthsary. Multiples of 12 are anniversaries. */
  number: number
  at: Date
}

const ZERO_DURATION: RelationshipDuration = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, totalMonths: 0 }

function inZone(date: Date, timeZone: string): TZDate {
  return new TZDate(date.getTime(), timeZone)
}

/** The moment of monthsary `n` (DR-01). n = 0 is the anchor itself. */
export function getMonthsary(startAt: Date, n: number, timeZone: string): Date {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Monthsary number must be a non-negative integer, got ${n}`)
  return new Date(addMonths(inZone(startAt, timeZone), n).getTime())
}

/** Number of monthsaries reached at `now` (0 before the first one). */
export function countMonthsariesReached(startAt: Date, now: Date, timeZone: string): number {
  if (now.getTime() < startAt.getTime()) return 0
  const start = inZone(startAt, timeZone)
  const current = inZone(now, timeZone)
  // Calendar-month difference is an upper bound; step back while it's in the future.
  let months = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth())
  while (months > 0 && getMonthsary(startAt, months, timeZone).getTime() > now.getTime()) months -= 1
  return Math.max(months, 0)
}

/** Elapsed time since the anchor, broken down per DR-02. Zero before the anchor. */
export function calculateRelationshipDuration(startAt: Date, now: Date, timeZone: string): RelationshipDuration {
  if (now.getTime() <= startAt.getTime()) return ZERO_DURATION

  const totalMonths = countMonthsariesReached(startAt, now, timeZone)
  const lastMonthsary = inZone(getMonthsary(startAt, totalMonths, timeZone), timeZone)
  const current = inZone(now, timeZone)

  let days = differenceInCalendarDays(current, lastMonthsary)
  while (days > 0 && addDays(lastMonthsary, days).getTime() > now.getTime()) days -= 1
  const dayBoundary = addDays(lastMonthsary, days)

  const remainderMs = now.getTime() - dayBoundary.getTime()
  const hours = Math.floor(remainderMs / MS_PER_HOUR)
  const minutes = Math.floor((remainderMs % MS_PER_HOUR) / MS_PER_MINUTE)

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    hours,
    minutes,
    totalMonths,
  }
}

/** The next monthsary strictly after `now` (the first one if before the anchor). */
export function getNextMonthsary(startAt: Date, now: Date, timeZone: string): Monthsary {
  const number = countMonthsariesReached(startAt, now, timeZone) + 1
  return { number, at: getMonthsary(startAt, number, timeZone) }
}

/**
 * The monthsary being celebrated today, if any: from its exact moment until the
 * end of that calendar day in the relationship timezone (PAGE-STRUCTURE §4.4).
 */
export function getMonthsaryToday(startAt: Date, now: Date, timeZone: string): Monthsary | null {
  const reached = countMonthsariesReached(startAt, now, timeZone)
  if (reached === 0) return null
  const at = getMonthsary(startAt, reached, timeZone)
  return isSameDay(inZone(at, timeZone), inZone(now, timeZone)) ? { number: reached, at } : null
}

export function isAnniversary(monthsaryNumber: number): boolean {
  return monthsaryNumber > 0 && monthsaryNumber % 12 === 0
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export function toOrdinal(n: number): string {
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/**
 * Converts a wall-clock date and time typed in `timeZone` to an exact instant.
 * Used by Settings, where the owner enters the anchor in the relationship's zone.
 */
export function zonedWallTimeToInstant(date: string, time: string, timeZone: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) throw new RangeError('Expected date YYYY-MM-DD and time HH:MM')
  const [, year, month, day] = dateMatch.map(Number) as [number, number, number, number]
  const [, hours, minutes] = timeMatch.map(Number) as [number, number, number]
  return new Date(new TZDate(year, month - 1, day, hours, minutes, timeZone).getTime())
}

/** Splits an instant into the wall-clock date (YYYY-MM-DD) and time (HH:MM) in `timeZone`. */
export function instantToZonedWallTime(instant: Date, timeZone: string): { date: string; time: string } {
  const zoned = inZone(instant, timeZone)
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    date: `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`,
    time: `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`,
  }
}
