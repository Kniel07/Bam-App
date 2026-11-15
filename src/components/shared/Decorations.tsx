/** Decorative SVG motifs (DESIGN-SYSTEM §5). All are aria-hidden. */

interface DecorationProps {
  className?: string
}

export function Sparkle({ className = 'size-3 text-rose' }: DecorationProps) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="currentColor">
      <path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" />
    </svg>
  )
}

export function Heart({ className = 'size-4 text-rose' }: DecorationProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21s-8.5-5.2-8.5-11.4C3.5 6.5 5.9 4.5 8.4 4.5c1.6 0 2.9.8 3.6 2.1.7-1.3 2-2.1 3.6-2.1 2.5 0 4.9 2 4.9 5.1C20.5 15.8 12 21 12 21z" />
    </svg>
  )
}

interface WaxSealProps extends DecorationProps {
  isBroken?: boolean
}

export function WaxSeal({ className = 'size-16', isBroken = false }: WaxSealProps) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={className}>
      <g className="text-rose-deep" fill="currentColor">
        {isBroken ? (
          <>
            <path d="M32 6a26 26 0 0 0-3 51.8L33 40l-6-8 7-9-2-17z" />
            <path d="M35 6.2l2 16.8-7 9 6 8-3 17.9A26 26 0 0 0 35 6.2z" transform="translate(3 2) rotate(6 32 32)" />
          </>
        ) : (
          <circle cx="32" cy="32" r="26" />
        )}
      </g>
      {!isBroken && (
        <path
          d="M32 44s-11-6.7-11-14.7c0-4 3.1-6.6 6.3-6.6 2.1 0 3.8 1 4.7 2.7.9-1.7 2.6-2.7 4.7-2.7 3.2 0 6.3 2.6 6.3 6.6C43 37.3 32 44 32 44z"
          className="text-blush"
          fill="currentColor"
          opacity="0.55"
        />
      )}
    </svg>
  )
}
