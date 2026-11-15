import { useState } from 'react'
import { Heart, Sparkle, WaxSeal } from '@/components/shared/Decorations'
import { Button } from '@/components/ui/Button'
import { useMarkWelcomed } from '@/features/relationship/hooks'

interface WelcomeEnvelopeProps {
  message: string
  signature: string
}

/**
 * First-visit welcome (A1, FR-SET-05): one envelope "For you" over Home.
 * Shown once ever; `welcomed_at` is recorded server-side so it doesn't repeat
 * on another device. The full letter-opening ceremony arrives with S4 and will
 * replace the simple fade used here.
 */
export function WelcomeEnvelope({ message, signature }: WelcomeEnvelopeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const markWelcomed = useMarkWelcomed()

  if (isDismissed) return null

  const close = () => {
    markWelcomed.mutate()
    setIsDismissed(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A letter for you"
      className="fixed inset-0 z-40 grid place-items-center bg-ink/30 px-5 backdrop-blur-[2px]"
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative w-full max-w-xs rounded-paper bg-petal px-6 pb-8 pt-16 text-center shadow-lift transition duration-[var(--duration-base)] hover:-translate-y-1"
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-20 origin-top bg-surface [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          <WaxSeal className="relative mx-auto -mt-6 mb-4 size-14" />
          <span className="block font-hand text-hand-lg text-ink">For you</span>
          <span className="mt-2 block text-small text-ink-soft">Tap to open</span>
          <Sparkle className="absolute right-4 top-4 size-3 text-rose" />
        </button>
      ) : (
        <article className="w-full max-w-md rounded-paper bg-surface px-6 py-8 shadow-lift motion-safe:animate-fade-in">
          <Heart className="mx-auto mb-4 size-6 text-rose" />
          <p className="whitespace-pre-line text-letter text-ink">{message}</p>
          <p className="mt-6 text-right font-hand text-hand text-rose-deep">— {signature}</p>
          <Button className="mt-8 w-full" onClick={close}>
            Come in
          </Button>
        </article>
      )}
    </div>
  )
}
