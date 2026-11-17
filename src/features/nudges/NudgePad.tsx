import { useState, type CSSProperties } from 'react'
import { Heart } from '@/components/shared/Decorations'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { useNames } from '@/features/relationship/hooks'
import type { NudgeKind } from '@/lib/supabase/database.types'
import { useNow } from '@/lib/time/useNow'
import { copy } from '@/lib/copy'
import { NudgeTooSoonError } from './api'
import { useRecentNudges, useSendNudge } from './hooks'
import { summarizeNudges, timeAgo } from './logic'
import { NUDGES, SECONDARY_NUDGES } from './nudgeKinds'
import { HugButton } from './HugButton'

// Fixed burst layout (angles in degrees) so it looks hand-placed every time.
const BURST = [-70, -35, 0, 35, 70, 110, 150, 210, 250, 290]

type Feedback = { tone: 'sent' | 'soon' | 'error'; text: string } | null

/**
 * Nudges (CR-05): one tap sends the other person a phone notification.
 * The big heart says "I MISS YOU"; three smaller nudges sit beneath it.
 */
export function NudgePad() {
  const { auth } = useAuth()
  const role = useRole()
  const names = useNames()
  const now = useNow()
  const nudges = useRecentNudges()
  const send = useSendNudge()
  const [burstKey, setBurstKey] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const myUserId = auth.status === 'member' ? auth.userId : null
  const otherName = role === 'owner' ? names.partner : names.owner
  const summary = summarizeNudges(nudges.data ?? [], myUserId, now)

  async function handleSend(kind: NudgeKind, hugSeconds?: number) {
    if (kind === 'miss_you') setBurstKey((value) => value + 1)
    navigator.vibrate?.(kind === 'miss_you' ? [20, 40, 20] : 15)
    setFeedback(null)
    try {
      await send.mutateAsync({ kind, hugSeconds })
      setFeedback({
        tone: 'sent',
        text: hugSeconds ? `A ${hugSeconds}-second hug sent to ${otherName} 🤗` : `Sent to ${otherName} ${NUDGES[kind].emoji}`,
      })
    } catch (error) {
      setFeedback(
        error instanceof NudgeTooSoonError
          ? { tone: 'soon', text: 'Sent a moment ago. They’ll feel it 💗' }
          : { tone: 'error', text: copy.errors.generic },
      )
    }
  }

  return (
    <section aria-labelledby="nudges-heading" className="flex flex-col items-center gap-4 rounded-lg bg-surface px-5 py-6 shadow-soft">
      <h2 id="nudges-heading" className="self-start font-sans text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">
        Little nudges
      </h2>

      {summary.togetherAt && (
        <p className="w-full animate-rise-in rounded-md bg-lavender-mist px-4 py-3 text-center text-small font-semibold text-lavender-deep">
          💞 You thought of each other at the same time ·{' '}
          <span className="font-normal text-ink-soft">{timeAgo(summary.togetherAt, now)}</span>
        </p>
      )}

      {summary.latestReceived && (
        <div role="status" className="flex w-full flex-col items-center gap-2 rounded-md bg-blush px-4 py-3 text-center text-small font-semibold text-rose-deep">
          <p>
            {NUDGES[summary.latestReceived.kind].emoji}{' '}
            {summary.latestReceived.kind === 'hug' && summary.latestReceived.hug_seconds
              ? `${otherName} sent you a ${summary.latestReceived.hug_seconds}-second hug`
              : NUDGES[summary.latestReceived.kind].received(otherName)}{' '}
            · <span className="font-normal text-ink-soft">{timeAgo(summary.latestReceived.created_at, now)}</span>
          </p>
          {summary.latestReceived.kind === 'hug' && (
            <button
              type="button"
              onClick={() => navigator.vibrate?.(Math.min(summary.latestReceived?.hug_seconds ?? 1, 5) * 1000)}
              className="min-h-11 rounded-full bg-surface px-4 text-small font-semibold text-rose-deep shadow-soft active:scale-95"
            >
              Feel it 🤗
            </button>
          )}
        </div>
      )}

      <div className="relative grid place-items-center py-2">
        {/* Burst: replays on every tap (keyed), hidden under reduced motion by the global rule. */}
        <span key={burstKey} aria-hidden className="pointer-events-none absolute inset-0">
          {burstKey > 0 &&
            BURST.map((angle, index) => (
              <span
                key={angle}
                className="absolute left-1/2 top-1/2 animate-burst"
                style={{ '--burst-angle': `${angle}deg`, animationDelay: `${index * 15}ms` } as CSSProperties}
              >
                <Heart className={index % 2 ? 'size-3 text-rose' : 'size-4 text-petal'} />
              </span>
            ))}
        </span>

        <button
          type="button"
          onClick={() => void handleSend('miss_you')}
          disabled={send.isPending}
          aria-label={`Send “I miss you” to ${otherName}`}
          className="relative grid size-40 place-items-center rounded-full bg-rose-deep text-white shadow-lift transition-transform duration-[var(--duration-fast)] active:scale-95 disabled:opacity-90"
        >
          <span key={burstKey} className={`relative grid size-full place-items-center ${burstKey > 0 ? 'animate-pop' : ''}`}>
            <Heart className="absolute inset-0 m-auto size-28 text-white/15" />
            <span className="relative font-display text-h2 leading-tight tracking-wide">
              I MISS
              <br />
              YOU
            </span>
          </span>
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <HugButton disabled={send.isPending} onHug={(seconds) => void handleSend('hug', seconds)} />
        {SECONDARY_NUDGES.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => void handleSend(kind)}
            disabled={send.isPending}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blush px-4 text-small font-semibold text-rose-deep transition-transform active:scale-95"
          >
            <span aria-hidden>{NUDGES[kind].emoji}</span>
            {NUDGES[kind].label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={`min-h-5 text-small ${feedback?.tone === 'error' ? 'text-error' : 'text-ink-soft'}`}>
        {feedback?.text ?? ''}
      </p>

      {(summary.sentThisWeek > 0 || summary.receivedThisWeek > 0) && (
        <p className="text-small text-ink-soft">
          This week: you 💗 {summary.sentThisWeek} · {otherName} 💗 {summary.receivedThisWeek}
        </p>
      )}
    </section>
  )
}
