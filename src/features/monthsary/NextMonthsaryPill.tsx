import { Heart } from '@/components/shared/Decorations'
import { getNextMonthsary, isAnniversary } from '@/lib/dates/monthsary'
import { formatCountdown } from './formatCountdown'

interface NextMonthsaryPillProps {
  startAt: Date
  timeZone: string
  now: Date
}

/** "Monthsary #2 · in 24 days" (FR-COUNT-03). */
export function NextMonthsaryPill({ startAt, timeZone, now }: NextMonthsaryPillProps) {
  const next = getNextMonthsary(startAt, now, timeZone)
  const label = isAnniversary(next.number) ? `Anniversary #${next.number / 12}` : `Monthsary #${next.number}`
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(next.at)

  return (
    <p className="mt-4 inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-blush px-4 py-2 text-small font-semibold text-rose-deep">
      <Heart className="size-4 text-rose-deep" />
      <span>{label}</span>
      <span aria-hidden>·</span>
      <span>{formatCountdown(next.at, now)}</span>
      <span className="font-normal text-ink-soft">({dateLabel})</span>
    </p>
  )
}
