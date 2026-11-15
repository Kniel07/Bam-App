import { Fragment, useMemo, useState } from 'react'
import { FloatingHearts } from '@/components/shared/FloatingHearts'
import { Sparkle } from '@/components/shared/Decorations'
import {
  calculateRelationshipDuration,
  getMonthsaryToday,
  isAnniversary,
  toOrdinal,
} from '@/lib/dates/monthsary'

interface MonthsaryCounterProps {
  startAt: Date
  timeZone: string
  message: string
  now: Date
}

interface Unit {
  label: string
  value: number
}

function pluralize(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? '' : 's'}`
}

/** Remembers per device that a given monthsary's hearts already played. */
function useHeartsOncePerMonthsary(monthsaryNumber: number | null): boolean {
  const [shouldPlay] = useState(() => {
    if (monthsaryNumber === null) return false
    const storageKey = `olu:hearts:${monthsaryNumber}`
    try {
      if (window.localStorage.getItem(storageKey)) return false
      window.localStorage.setItem(storageKey, '1')
    } catch {
      // Storage unavailable (private mode): playing again is harmless.
    }
    return true
  })
  return shouldPlay && monthsaryNumber !== null
}

/** The heart of Home (FR-COUNT-01…05, PAGE-STRUCTURE §4.4). */
export function MonthsaryCounter({ startAt, timeZone, message, now }: MonthsaryCounterProps) {
  const duration = calculateRelationshipDuration(startAt, now, timeZone)
  const today = useMemo(() => getMonthsaryToday(startAt, now, timeZone), [startAt, now, timeZone])
  const playHearts = useHeartsOncePerMonthsary(today?.number ?? null)

  // Years appear once there is at least one (an empty "0 years" feels cold).
  const units: Unit[] = [
    ...(duration.years > 0 ? [{ label: duration.years === 1 ? 'year' : 'years', value: duration.years }] : []),
    { label: duration.months === 1 ? 'month' : 'months', value: duration.months },
    { label: duration.days === 1 ? 'day' : 'days', value: duration.days },
    { label: duration.hours === 1 ? 'hour' : 'hours', value: duration.hours },
    { label: duration.minutes === 1 ? 'minute' : 'minutes', value: duration.minutes },
  ]

  // Each part stays on one line, so wrapping happens only between parts.
  const headlineParts = [
    duration.years > 0 ? pluralize(duration.years, 'year') : null,
    duration.months > 0 ? pluralize(duration.months, 'month') : null,
    pluralize(duration.days, 'day'),
  ].filter((part): part is string => part !== null)

  const celebration = today
    ? isAnniversary(today.number)
      ? `Happy ${toOrdinal(today.number / 12)} anniversary`
      : `Happy ${toOrdinal(today.number)} monthsary`
    : null

  return (
    <section
      aria-labelledby="counter-heading"
      className={`relative overflow-hidden rounded-lg px-5 py-6 shadow-soft md:px-8 md:py-8 ${today ? 'bg-blush' : 'bg-surface'}`}
    >
      {playHearts && <FloatingHearts />}
      <Sparkle className="absolute right-6 top-6 size-3 text-rose" />
      <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">
        {celebration ?? 'Together for'}
      </p>
      <h2 id="counter-heading" className="mt-1 text-display">
        {headlineParts.map((part, index) => (
          <Fragment key={part}>
            {index > 0 && <span className="text-rose"> · </span>}
            <span className="whitespace-nowrap">{part}</span>
          </Fragment>
        ))}
      </h2>

      <dl className="mt-5 grid gap-1.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${units.length}, minmax(0, 1fr))` }}>
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col-reverse rounded-md bg-cream/80 px-0.5 py-3 text-center">
            <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] text-ink-soft sm:text-micro">{unit.label}</dt>
            <dd className="font-display text-h2 tabular-nums text-rose-deep">{unit.value}</dd>
          </div>
        ))}
      </dl>

      {message && <p className="mt-5 font-hand text-hand-lg text-rose-deep">“{message}”</p>}
    </section>
  )
}
