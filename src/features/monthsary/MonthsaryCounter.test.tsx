import { render, screen, within } from '@testing-library/react'
import { zonedWallTimeToInstant } from '@/lib/dates/monthsary'
import { MonthsaryCounter } from './MonthsaryCounter'

const TZ = 'Asia/Tokyo'
const start = zonedWallTimeToInstant('2025-03-10', '00:35', TZ)
const at = (date: string, time: string) => zonedWallTimeToInstant(date, time, TZ)

function tile(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return within(term.parentElement as HTMLElement).getByRole('definition').textContent
}

describe('MonthsaryCounter', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows months, days, hours and minutes, hiding years while zero', () => {
    render(<MonthsaryCounter startAt={start} timeZone={TZ} message="msg" now={at('2025-04-17', '15:02')} />)
    expect(screen.queryByText(/years?/, { selector: 'dt' })).not.toBeInTheDocument()
    expect(tile('month')).toBe('1')
    expect(tile('days')).toBe('7')
    expect(tile('hours')).toBe('14')
    expect(tile('minutes')).toBe('27')
    expect(screen.getByRole('heading')).toHaveTextContent('1 month · 7 days')
  })

  it('shows years once there is at least one', () => {
    render(<MonthsaryCounter startAt={start} timeZone={TZ} message="" now={at('2026-05-12', '01:00')} />)
    expect(tile('year')).toBe('1')
  })

  it('celebrates on the monthsary day', () => {
    render(<MonthsaryCounter startAt={start} timeZone={TZ} message="" now={at('2025-05-10', '09:00')} />)
    expect(screen.getByText('Happy 2nd monthsary')).toBeInTheDocument()
  })

  it('celebrates anniversaries as anniversaries', () => {
    render(<MonthsaryCounter startAt={start} timeZone={TZ} message="" now={at('2026-03-10', '09:00')} />)
    expect(screen.getByText('Happy 1st anniversary')).toBeInTheDocument()
  })

  it('shows the counter message from settings', () => {
    render(<MonthsaryCounter startAt={start} timeZone={TZ} message="Every day with you" now={at('2025-04-17', '15:02')} />)
    expect(screen.getByText('“Every day with you”')).toBeInTheDocument()
  })
})
