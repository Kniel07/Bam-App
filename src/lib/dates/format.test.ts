import { formatCalendarDate, formatInstantDate, todayInZone } from './format'

describe('date formatting', () => {
  it('never shifts a calendar date, whatever the device timezone', () => {
    // Runs in the test process timezone; UTC formatting keeps the same day.
    expect(formatCalendarDate('2025-01-01')).toMatch(/2025/)
    expect(formatCalendarDate('2025-01-01')).toMatch(/1/)
    expect(formatCalendarDate('2025-01-01')).not.toMatch(/2024/)
  })

  it('formats an instant in the given zone', () => {
    // 2025-01-31 16:00 UTC is Feb 1 in Tokyo and Jan 31 in New York.
    const instant = '2025-01-31T16:00:00Z'
    expect(formatInstantDate(instant, 'Asia/Tokyo')).toMatch(/February 1|1 February|Feb/)
    expect(formatInstantDate(instant, 'America/New_York')).toMatch(/January 31|31 January|Jan/)
  })

  it('returns today as YYYY-MM-DD', () => {
    expect(todayInZone('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
