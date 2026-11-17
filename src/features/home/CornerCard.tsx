import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

/** "Corners of our universe" entry card on Home (PAGE-STRUCTURE §4.4). */
export function CornerCard({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex min-h-24 flex-col justify-between rounded-md bg-surface p-4 shadow-soft transition duration-[var(--duration-fast)] hover:shadow-lift active:scale-[0.98]"
    >
      <span className="flex items-center justify-between font-display text-h3 text-ink">
        {title}
        <ChevronRight aria-hidden className="size-5 text-rose transition group-hover:translate-x-0.5" />
      </span>
      <span className="mt-2 text-small text-ink-soft">{children}</span>
    </Link>
  )
}
