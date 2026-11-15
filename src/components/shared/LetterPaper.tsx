import { Heart } from './Decorations'
import { Polaroid } from './Polaroid'

interface LetterPaperProps {
  label: string
  body: string
  signature: string
  photoPath?: string | null
}

/**
 * The letter itself (COMPONENT-SPECIFICATION §3). Renders text only, so content
 * can never inject markup (SEC-05); line breaks are preserved.
 */
export function LetterPaper({ label, body, signature, photoPath }: LetterPaperProps) {
  return (
    <article className="rounded-paper bg-surface px-6 py-8 shadow-lift md:px-10 md:py-10">
      <p className="font-hand text-hand-lg text-rose-deep">{label}</p>
      <Heart className="my-4 size-4 text-rose" />
      <div className="whitespace-pre-line text-letter text-ink">{body}</div>
      <p className="mt-8 text-right font-hand text-hand-lg text-rose-deep">— {signature}</p>
      {photoPath && (
        <div className="mx-auto mt-8 w-56 max-w-full">
          <Polaroid path={photoPath} alt={label} tiltSeed={photoPath} />
        </div>
      )}
    </article>
  )
}
