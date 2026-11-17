import { ImageOff } from 'lucide-react'
import { useSignedUrl } from '@/lib/media/storage'

/** Deterministic tilt in [-2°, +2°] from an id (DS-06): hand-placed, never jittery. */
export function tiltFromSeed(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) | 0
  return ((Math.abs(hash) % 41) - 20) / 10
}

interface PolaroidProps {
  /** Storage path of a private image (resolved to a signed URL), or a local object URL. */
  path?: string | null
  localSrc?: string
  alt: string
  caption?: string
  tiltSeed?: string
  withTape?: boolean
  className?: string
  /** Shared-element name so the photo zooms between gallery and detail (View Transitions). */
  transitionName?: string
}

/** Polaroid frame (COMPONENT-SPECIFICATION §3). */
export function Polaroid({ path, localSrc, alt, caption, tiltSeed, withTape = true, className = '', transitionName }: PolaroidProps) {
  const signedUrl = useSignedUrl(localSrc ? null : path)
  const src = localSrc ?? signedUrl.data
  const tilt = tiltSeed ? tiltFromSeed(tiltSeed) : 0

  return (
    <figure
      className={`relative rounded-paper bg-white px-2.5 pt-2.5 pb-3 shadow-lift ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {withTape && (
        <span aria-hidden className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-3deg] bg-blush/70" />
      )}
      <div className="aspect-[4/5] overflow-hidden bg-blush">
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            style={transitionName ? { viewTransitionName: transitionName } : undefined}
          />
        ) : signedUrl.isError ? (
          <div className="grid size-full place-items-center text-ink-soft" role="img" aria-label="Photo unavailable">
            <ImageOff aria-hidden className="size-6" />
          </div>
        ) : (
          <div aria-hidden className="size-full animate-shimmer bg-blush" />
        )}
      </div>
      {caption && <figcaption className="mt-2 line-clamp-2 text-center font-hand text-hand text-ink">{caption}</figcaption>}
    </figure>
  )
}
