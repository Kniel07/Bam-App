import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { timeAgo } from '@/features/nudges/logic'
import { useNames } from '@/features/relationship/hooks'
import type { MoodKind } from '@/lib/supabase/database.types'
import { useNow } from '@/lib/time/useNow'
import { copy } from '@/lib/copy'
import { TooSoonError, type Mood } from './api'
import { useRecentMoods, useShareMood } from './hooks'
import { moodInfo, MOODS } from './moods'

export function latestMoodOf(moods: Mood[] | undefined, userId: string | null): Mood | undefined {
  return moods?.find((mood) => mood.user_id === userId)
}

/** Mood check-in (CR-06 #2): share how you feel; see how they feel. */
export function MoodCheckIn() {
  const { auth } = useAuth()
  const role = useRole()
  const names = useNames()
  const now = useNow()
  const moods = useRecentMoods()
  const share = useShareMood()
  const [selected, setSelected] = useState<MoodKind | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const myUserId = auth.status === 'member' ? auth.userId : null
  const otherName = role === 'owner' ? names.partner : names.owner
  const mine = latestMoodOf(moods.data, myUserId)
  const theirs = moods.data?.find((mood) => mood.user_id !== myUserId)

  async function handleShare() {
    if (!selected) return
    setMessage(null)
    try {
      await share.mutateAsync({ mood: selected, note })
      setMessage(`Shared with ${otherName} 🌤️`)
      setSelected(null)
      setNote('')
    } catch (error) {
      setMessage(error instanceof TooSoonError ? 'You just checked in. Try again in a minute.' : copy.errors.generic)
    }
  }

  return (
    <section aria-labelledby="mood-heading" className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-soft">
      <h2 id="mood-heading" className="text-h2">How are you feeling?</h2>

      <div className="grid grid-cols-2 gap-3 text-small">
        <div className="rounded-md bg-blush px-3 py-3">
          <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">{otherName}</p>
          {theirs ? (
            <>
              <p className="mt-1 text-body font-semibold text-rose-deep">
                {moodInfo(theirs.mood).emoji} {moodInfo(theirs.mood).label}
              </p>
              {theirs.note && <p className="mt-1 text-ink">“{theirs.note}”</p>}
              <p className="mt-1 text-ink-soft">{timeAgo(theirs.created_at, now)}</p>
            </>
          ) : (
            <p className="mt-1 text-ink-soft">No check-in yet</p>
          )}
        </div>
        <div className="rounded-md bg-lavender-mist px-3 py-3">
          <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">You</p>
          {mine ? (
            <>
              <p className="mt-1 text-body font-semibold text-lavender-deep">
                {moodInfo(mine.mood).emoji} {moodInfo(mine.mood).label}
              </p>
              <p className="mt-1 text-ink-soft">{timeAgo(mine.created_at, now)}</p>
            </>
          ) : (
            <p className="mt-1 text-ink-soft">Share your first one below</p>
          )}
        </div>
      </div>

      <div role="radiogroup" aria-label="Your mood" className="grid grid-cols-4 gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.kind}
            type="button"
            role="radio"
            aria-checked={selected === mood.kind}
            aria-label={mood.label}
            onClick={() => setSelected(mood.kind)}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md border text-micro font-semibold transition-transform active:scale-95 ${
              selected === mood.kind ? 'border-rose-deep bg-blush text-rose-deep' : 'border-line bg-cream text-ink-soft'
            }`}
          >
            <span aria-hidden className="text-h2 leading-none">
              {mood.emoji}
            </span>
            {mood.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex animate-rise-in flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-small font-semibold text-ink">
            A few words (optional)
            <input
              value={note}
              maxLength={80}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-12 rounded-sm border border-line bg-surface px-4 text-body font-normal outline-none focus:border-rose-deep focus:ring-2 focus:ring-rose-deep/20"
            />
          </label>
          <Button onClick={() => void handleShare()} isLoading={share.isPending}>
            Share {moodInfo(selected).emoji}
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-small text-ink-soft">
          {message}
        </p>
      )}
    </section>
  )
}
