import { useSyncExternalStore } from 'react'
import { Heart } from './Decorations'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}

// Fixed layout so the burst looks hand-arranged and identical every time.
const HEARTS = [
  { left: '12%', size: 'size-4', delay: '0ms', tone: 'text-rose' },
  { left: '26%', size: 'size-3', delay: '350ms', tone: 'text-petal' },
  { left: '41%', size: 'size-5', delay: '120ms', tone: 'text-rose' },
  { left: '57%', size: 'size-3', delay: '520ms', tone: 'text-lavender-deep/40' },
  { left: '70%', size: 'size-4', delay: '240ms', tone: 'text-rose' },
  { left: '84%', size: 'size-3', delay: '680ms', tone: 'text-petal' },
]

/**
 * Monthsary hearts (DESIGN-SYSTEM §6.2): float up once, then gone. Under
 * reduced motion they render as a small static cluster instead.
 */
export function FloatingHearts() {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div aria-hidden className="pointer-events-none absolute right-5 top-4 flex gap-1">
        <Heart className="size-3 text-rose" />
        <Heart className="size-4 text-rose" />
        <Heart className="size-3 text-petal" />
      </div>
    )
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-full overflow-hidden">
      {HEARTS.map((heart) => (
        <span
          key={heart.left}
          className="absolute bottom-2 animate-float-up opacity-0"
          style={{ left: heart.left, animationDelay: heart.delay }}
        >
          <Heart className={`${heart.size} ${heart.tone}`} />
        </span>
      ))}
    </div>
  )
}
