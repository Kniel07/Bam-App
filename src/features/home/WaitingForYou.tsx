import { Link } from 'react-router'
import { ChevronRight, Mail } from 'lucide-react'
import type { Letter } from '@/features/letters/api'

/** Unread letters she can open now (PAGE-STRUCTURE §4.4). */
export function WaitingForYou({ letters }: { letters: Letter[] }) {
  return (
    <section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
      <h2 id="waiting-heading" className="font-sans text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">
        Waiting for you
      </h2>
      <ul className="flex flex-col gap-2">
        {letters.slice(0, 3).map((letter) => (
          <li key={letter.id}>
            <Link
              to="/letters"
              className="flex min-h-14 items-center gap-3 rounded-md bg-petal/60 px-4 py-3 shadow-soft transition hover:shadow-lift"
            >
              <Mail aria-hidden className="size-5 shrink-0 text-rose-deep" />
              <span className="flex-1 font-hand text-hand text-ink">{letter.label}</span>
              <ChevronRight aria-hidden className="size-5 text-rose-deep" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
