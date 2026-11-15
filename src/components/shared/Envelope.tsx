import { Check, Lock } from 'lucide-react'
import { WaxSeal } from './Decorations'

export type EnvelopeVisualState = 'draft' | 'locked' | 'new' | 'sealed' | 'opened'

interface EnvelopeProps {
  label: string
  state: EnvelopeVisualState
  /** Short status line under the label, e.g. "in 3 days" or "opened". */
  caption?: string
  onSelect: () => void
}

const STATE_CLASSES: Record<EnvelopeVisualState, string> = {
  sealed: 'bg-petal',
  new: 'bg-petal ring-2 ring-rose ring-offset-2 ring-offset-cream shadow-lift',
  locked: 'bg-blush opacity-80',
  opened: 'bg-blush',
  draft: 'bg-surface outline-2 outline-dashed outline-lavender-deep/40',
}

/** Envelope card for the letters grid (COMPONENT-SPECIFICATION §3). */
export function Envelope({ label, state, caption, onSelect }: EnvelopeProps) {
  const accessibleState = { sealed: 'sealed', new: 'new', locked: 'locked', opened: 'opened', draft: 'draft' }[state]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${label}, ${accessibleState}${caption ? `, ${caption}` : ''}`}
      className={`group relative flex aspect-square w-full flex-col items-center justify-end overflow-hidden rounded-paper px-3 pb-4 text-center shadow-soft transition duration-[var(--duration-base)] ease-[var(--ease-gentle)] hover:-translate-y-0.5 hover:shadow-lift ${STATE_CLASSES[state]}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[38%] bg-surface/90 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
      <span aria-hidden className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        {state === 'locked' ? (
          <span className="grid size-9 place-items-center rounded-full bg-surface text-ink-soft shadow-soft">
            <Lock className="size-4" />
          </span>
        ) : (
          <WaxSeal className="size-9 drop-shadow-sm" isBroken={state === 'opened'} />
        )}
      </span>
      {state === 'new' && (
        <span className="absolute right-2 top-2 rounded-full bg-rose-deep px-2 py-0.5 text-micro font-bold uppercase tracking-[0.06em] text-white">
          New
        </span>
      )}
      {state === 'draft' && (
        <span className="absolute right-2 top-2 rounded-full bg-lavender-mist px-2 py-0.5 text-micro font-bold uppercase tracking-[0.06em] text-lavender-deep">
          Draft
        </span>
      )}
      <span className="relative line-clamp-2 font-hand text-hand leading-tight text-ink">{label}</span>
      {caption && (
        <span className="relative mt-1 flex items-center gap-1 text-small text-ink-soft">
          {state === 'opened' && <Check aria-hidden className="size-3.5" />}
          {caption}
        </span>
      )}
    </button>
  )
}
