import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { Sparkle, WaxSeal } from '@/components/shared/Decorations'
import { copy } from '@/lib/copy'
import { LetterLockedError, type Letter } from './api'
import { useOpenLetter } from './hooks'

type Phase = 'presented' | 'opening' | 'failed' | 'locked'

interface EnvelopeOpeningProps {
  letter: Letter
  onOpened: (letterId: string) => void
  onCancel: () => void
}

const EASE_GENTLE = [0.22, 1, 0.36, 1] as const

/**
 * The letter-opening ceremony (A3, DESIGN-SYSTEM §6.2): the envelope is
 * presented, she taps the seal, the database is asked to open the letter, and
 * only then does the flap lift and the paper rise. Tapping anywhere skips the
 * animation. Under reduced motion it becomes a quick fade.
 */
export function EnvelopeOpening({ letter, onOpened, onCancel }: EnvelopeOpeningProps) {
  const [phase, setPhase] = useState<Phase>('presented')
  const open = useOpenLetter()
  const prefersReducedMotion = useReducedMotion()
  const hasFinished = useRef(false)
  const sealRef = useRef<HTMLButtonElement>(null)

  useEffect(() => sealRef.current?.focus(), [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'opening') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onCancel])

  const finish = () => {
    if (hasFinished.current) return
    hasFinished.current = true
    onOpened(letter.id)
  }

  async function breakSeal() {
    if (phase === 'opening') return
    try {
      await open.mutateAsync(letter.id)
      setPhase('opening')
      if (prefersReducedMotion) finish()
    } catch (error) {
      setPhase(error instanceof LetterLockedError ? 'locked' : 'failed')
    }
  }

  const isOpening = phase === 'opening'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={letter.label}
      className="fixed inset-0 z-40 grid place-items-center bg-ink/35 px-6 backdrop-blur-[2px]"
      onClick={isOpening ? finish : undefined}
    >
      {!isOpening && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-surface/80 text-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
      )}

      <div className="relative w-full max-w-xs" style={{ perspective: 900 }}>
        {/* Paper rising out of the envelope */}
        <AnimatePresence>
          {isOpening && (
            <motion.div
              key="paper"
              aria-hidden
              className="absolute inset-x-4 top-4 h-48 rounded-paper bg-surface shadow-lift"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -150, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6, ease: EASE_GENTLE }}
              onAnimationComplete={finish}
            >
              <div className="flex flex-col gap-2 p-5">
                <span className="h-2 w-3/4 rounded-full bg-blush" />
                <span className="h-2 w-full rounded-full bg-blush" />
                <span className="h-2 w-5/6 rounded-full bg-blush" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Envelope body */}
        <motion.div
          className="relative aspect-[4/3] w-full rounded-paper bg-petal shadow-lift"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: EASE_GENTLE }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 z-10 h-1/2 origin-top bg-surface [clip-path:polygon(0_0,100%_0,50%_100%)]"
            animate={isOpening ? { rotateX: 180 } : { rotateX: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: EASE_GENTLE }}
          />
          <motion.button
            ref={sealRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void breakSeal()
            }}
            disabled={open.isPending || isOpening}
            aria-label="Break the seal to open the letter"
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
            animate={isOpening ? { scale: 1.3, opacity: 0 } : open.isPending ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={isOpening ? { duration: 0.25 } : { duration: 0.9, repeat: open.isPending ? Infinity : 0 }}
          >
            <WaxSeal className="size-16 drop-shadow-md" />
          </motion.button>
          <span className="absolute inset-x-0 bottom-4 px-4 text-center font-hand text-hand text-ink">{letter.label}</span>
          <Sparkle className="absolute right-4 top-3 z-20 size-3 text-rose" />
        </motion.div>

        <div className="mt-6 min-h-12 text-center" aria-live="polite">
          {phase === 'presented' && (
            <p className="inline-block rounded-full bg-surface px-4 py-1.5 font-hand text-hand-lg text-rose-deep shadow-soft">
              Tap the seal to open
            </p>
          )}
          {phase === 'failed' && (
            <p role="alert" className="rounded-sm bg-surface px-3 py-2 text-small text-ink">
              Couldn&rsquo;t open it. Try again?
            </p>
          )}
          {phase === 'locked' && (
            <p role="alert" className="rounded-sm bg-surface px-3 py-2 text-small text-ink">
              This letter isn&rsquo;t ready yet.
            </p>
          )}
          {isOpening && <p className="sr-only">{copy.key.opening}</p>}
        </div>
      </div>
    </div>
  )
}
