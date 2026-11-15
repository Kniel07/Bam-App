import type { ReactNode } from 'react'
import { Sparkle } from '@/components/shared/Decorations'
import { copy } from '@/lib/copy'
import { Button } from './Button'

/** Content-shaped placeholder; static under reduced motion (DESIGN-SYSTEM §6.3). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-shimmer rounded-md bg-blush ${className}`} />
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Sparkle className="size-4 text-rose" />
      <p className="font-hand text-hand-lg text-rose-deep">{title}</p>
      {message && <p className="max-w-xs text-small text-ink-soft">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = copy.errors.generic, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-md bg-surface px-4 py-8 text-center shadow-soft">
      <p className="text-body text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {copy.errors.retry}
        </Button>
      )}
    </div>
  )
}
