import { useEffect, useRef, useState } from 'react'
import { MAX_HUG_SECONDS } from './nudgeKinds'

// Timing helpers live outside the component: render code stays pure.
const now = () => Date.now()
const heldFor = (startedAt: number) => Math.min(now() - startedAt, MAX_HUG_SECONDS * 1000)
const toSeconds = (ms: number) => Math.max(1, Math.min(MAX_HUG_SECONDS, Math.round(ms / 1000)))

interface HugButtonProps {
  disabled: boolean
  onHug: (seconds: number) => void
}

/**
 * Hold-to-hug (CR-06 #3): press and hold; the longer the hold, the longer the
 * hug (1–15 s). A tap or keyboard press sends a 1-second hug.
 */
export function HugButton({ disabled, onHug }: HugButtonProps) {
  const [heldMs, setHeldMs] = useState(0)
  const startedAt = useRef<number | null>(null)
  const frame = useRef<number | null>(null)

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current)
  }, [])

  const tick = () => {
    if (startedAt.current === null) return
    const elapsed = heldFor(startedAt.current)
    setHeldMs(elapsed)
    if (elapsed % 1000 < 20) navigator.vibrate?.(10)
    frame.current = requestAnimationFrame(tick)
  }

  const start = () => {
    if (disabled) return
    startedAt.current = now()
    frame.current = requestAnimationFrame(tick)
  }

  const finish = (send: boolean) => {
    if (startedAt.current === null) return
    const elapsed = heldFor(startedAt.current)
    startedAt.current = null
    if (frame.current) cancelAnimationFrame(frame.current)
    setHeldMs(0)
    if (send) onHug(toSeconds(elapsed))
  }

  const seconds = toSeconds(heldMs)
  const progress = heldMs / (MAX_HUG_SECONDS * 1000)

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={() => finish(true)}
      onPointerLeave={() => finish(false)}
      onPointerCancel={() => finish(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onHug(1)
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Hold to send a hug"
      className="relative inline-flex min-h-11 select-none items-center gap-1.5 overflow-hidden rounded-full bg-blush px-4 text-small font-semibold text-rose-deep transition-transform active:scale-95 [touch-action:none]"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 bg-petal transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
      <span aria-hidden className="relative">🤗</span>
      <span className="relative">{heldMs > 0 ? `${seconds}-second hug…` : 'Hold to hug'}</span>
    </button>
  )
}
