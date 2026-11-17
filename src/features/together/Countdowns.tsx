import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { TextField } from '@/components/ui/TextField'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { formatCountdown } from '@/features/monthsary/formatCountdown'
import { useRelationship } from '@/features/relationship/hooks'
import { instantToZonedWallTime, zonedWallTimeToInstant } from '@/lib/dates/monthsary'
import { todayInZone } from '@/lib/dates/format'
import { useNow } from '@/lib/time/useNow'
import { staggerStyle } from '@/lib/stagger'
import { copy } from '@/lib/copy'
import type { Countdown } from './api'
import { useCountdowns, useDeleteCountdown, useSaveCountdown } from './hooks'

/** Upcoming countdowns, soonest first (past ones drop off). */
export function upcomingCountdowns(countdowns: Countdown[] | undefined, now: Date): Countdown[] {
  return (countdowns ?? []).filter((countdown) => new Date(countdown.target_at).getTime() > now.getTime())
}

function CountdownEditor({ countdown, onClose }: { countdown?: Countdown; onClose: () => void }) {
  const relationship = useRelationship()
  const timeZone = relationship.data?.timezone ?? 'UTC'
  const initial = countdown ? instantToZonedWallTime(new Date(countdown.target_at), timeZone) : { date: todayInZone(timeZone), time: '00:00' }
  const [title, setTitle] = useState(countdown?.title ?? '')
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveCountdown()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const target = zonedWallTimeToInstant(date, time, timeZone)
    if (target.getTime() <= Date.now()) {
      setError('Pick a moment in the future.')
      return
    }
    try {
      await save.mutateAsync({ id: countdown?.id, title, targetAt: target.toISOString() })
      onClose()
    } catch {
      setError(copy.errors.generic)
    }
  }

  return (
    <Sheet isOpen onClose={onClose} title={countdown ? 'Edit countdown' : 'New countdown'}>
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <TextField label="What are we counting down to?" value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} hint="e.g. “Until I see you again”" required />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          <TextField label="Time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
        </div>
        {error && (
          <p role="alert" className="text-small text-error">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={save.isPending} disabled={!title.trim()}>
          {countdown ? 'Save' : 'Start counting'}
        </Button>
      </form>
    </Sheet>
  )
}

/** Countdown together (CR-06 #5). Shared authorship: both add; each edits own; owner may remove any. */
export function Countdowns() {
  const { auth } = useAuth()
  const isOwner = useRole() === 'owner'
  const userId = auth.status === 'member' ? auth.userId : null
  const countdowns = useCountdowns()
  const remove = useDeleteCountdown()
  const now = useNow()
  const [editing, setEditing] = useState<{ countdown?: Countdown; key: string } | null>(null)
  const [removing, setRemoving] = useState<Countdown | null>(null)
  const upcoming = upcomingCountdowns(countdowns.data, now)

  return (
    <section aria-labelledby="countdowns-heading" className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 id="countdowns-heading" className="text-h2">Counting down</h2>
        <Button size="sm" variant="secondary" iconLeft={<Plus aria-hidden className="size-4" />} onClick={() => setEditing({ key: crypto.randomUUID() })}>
          Add
        </Button>
      </div>

      {countdowns.isPending ? (
        <Skeleton className="h-20" />
      ) : countdowns.isError ? (
        <ErrorState onRetry={() => void countdowns.refetch()} />
      ) : upcoming.length === 0 ? (
        <EmptyState title="Nothing to count down to yet" message="Add the next time you’ll see each other." />
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.map((countdown, index) => (
            <li key={countdown.id} className="flex animate-rise-in items-center gap-3 rounded-md bg-blush px-4 py-3" style={staggerStyle(index)}>
              <span aria-hidden className="text-h2">⏳</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{countdown.title}</p>
                <p className="text-small text-rose-deep">{formatCountdown(new Date(countdown.target_at), now)}</p>
              </div>
              {countdown.created_by === userId && (
                <button
                  type="button"
                  onClick={() => setEditing({ countdown, key: countdown.id + countdown.updated_at })}
                  aria-label={`Edit ${countdown.title}`}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface"
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
              )}
              {(countdown.created_by === userId || isOwner) && (
                <button
                  type="button"
                  onClick={() => setRemoving(countdown)}
                  aria-label={`Remove ${countdown.title}`}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface hover:text-error"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && <CountdownEditor key={editing.key} countdown={editing.countdown} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove countdown?"
        message={`"${removing?.title ?? ''}" will be removed for both of you.`}
        confirmLabel="Remove"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => {
          if (removing) void remove.mutateAsync(removing.id).finally(() => setRemoving(null))
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  )
}
