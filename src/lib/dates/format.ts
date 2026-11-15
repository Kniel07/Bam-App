/**
 * Display formatting. Calendar dates (`YYYY-MM-DD`, no time) are formatted in
 * UTC so they never shift by a day in the viewer's timezone.
 */
export function formatCalendarDate(isoDate: string, style: 'long' | 'medium' = 'long'): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: style, timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** An instant shown as a date in the relationship timezone. */
export function formatInstantDate(instant: string | Date, timeZone: string, style: 'long' | 'medium' = 'long'): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: style, timeZone }).format(new Date(instant))
}

/** Today's calendar date (YYYY-MM-DD) in a timezone. */
export function todayInZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
