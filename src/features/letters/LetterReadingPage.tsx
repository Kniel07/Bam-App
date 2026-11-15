import { Link, useParams } from 'react-router'
import { ArrowLeft, Lock } from 'lucide-react'
import { LetterPaper } from '@/components/shared/LetterPaper'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useDisplayNameFor, useRelationship } from '@/features/relationship/hooks'
import { formatInstantDate } from '@/lib/dates/format'
import { LetterLockedError } from './api'
import { useOpenedLetter } from './hooks'

/**
 * Reading view (PAGE-STRUCTURE §4.7). Content always comes from open_letter(),
 * so visiting the URL of a locked letter shows it as locked, never its text.
 */
export function LetterReadingPage() {
  const { letterId = '' } = useParams()
  const opened = useOpenedLetter(letterId)
  const relationship = useRelationship()
  const nameFor = useDisplayNameFor()

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4">
      <Link to="/letters" className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-rose-deep">
        <ArrowLeft aria-hidden className="size-4" /> All letters
      </Link>

      {opened.isPending ? (
        <Skeleton className="h-96 rounded-paper" />
      ) : opened.isError ? (
        opened.error instanceof LetterLockedError ? (
          <div className="flex flex-col items-center gap-3 rounded-paper bg-blush px-6 py-12 text-center shadow-soft">
            <Lock aria-hidden className="size-6 text-ink-soft" />
            <p className="font-hand text-hand-lg text-rose-deep">Not yet…</p>
            <p className="text-small text-ink-soft">This letter is still sealed. It will open at its moment.</p>
          </div>
        ) : (
          <ErrorState onRetry={() => void opened.refetch()} />
        )
      ) : (
        <>
          <LetterPaper label={opened.data.label} body={opened.data.body} signature={nameFor(opened.data.authorId)} photoPath={opened.data.photoPath} />
          {opened.data.firstOpenedAt && relationship.data && (
            <p className="text-center text-small text-ink-soft">
              First opened {formatInstantDate(opened.data.firstOpenedAt, relationship.data.timezone)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
