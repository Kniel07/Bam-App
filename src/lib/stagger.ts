import type { CSSProperties } from 'react'

const STEP_MS = 45
const MAX_STEPS = 8

/**
 * Inline delay for staggered entrances: items rise in one after another, capped
 * so long lists never wait. Combine with the `animate-rise-in` class.
 * (Reduced motion removes the delay; see styles/index.css.)
 */
export function staggerStyle(index: number): CSSProperties {
  return { animationDelay: `${Math.min(index, MAX_STEPS) * STEP_MS}ms` }
}
