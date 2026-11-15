import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Pencil } from 'lucide-react'
import { Envelope } from '@/components/shared/Envelope'
import { Fab } from '@/components/ui/Fab'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useRole } from '@/features/auth/useAuth'
import { formatCountdown } from '@/features/monthsary/formatCountdown'
import { useNow } from '@/lib/time/useNow'
import type { Letter } from './api'
import { EnvelopeOpening } from './EnvelopeOpening'
import { useLetters } from './hooks'
import { LetterEditorSheet } from './LetterEditorSheet'
import { getEnvelopeState, sortEnvelopes, type EnvelopeState } from './logic'

type EditorState = { isOpen: false } | { isOpen: true; letter?: Letter; key: string }

function captionFor(letter: Letter, state: EnvelopeState, now: Date, isOwner: boolean): string | undefined {
  switch (state) {
    case 'locked':
      return letter.unlock_at ? `Not yet… opens ${formatCountdown(new Date(letter.unlock_at), now)}` : undefined
    case 'opened':
      return isOwner ? 'opened by her' : 'opened'
    case 'new':
      return 'just unlocked'
    case 'draft':
      return letter.unlock_type === 'scheduled' ? 'scheduled' : 'anytime'
    case 'sealed':
      return undefined
  }
}

/** Letters (PAGE-STRUCTURE §4.6, FR-LETTER-01…09). */
export function LettersPage() {
  const letters = useLetters()
  const isOwner = useRole() === 'owner'
  const now = useNow()
  const navigate = useNavigate()
  const [presented, setPresented] = useState<Letter | null>(null)
  const [lockedNotice, setLockedNotice] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ isOpen: false })

  function handleSelect(letter: Letter, state: EnvelopeState) {
    setLockedNotice(null)
    if (state === 'locked' && !isOwner) {
      setLockedNotice(captionFor(letter, state, now, false) ?? 'Not yet…')
      return
    }
    if (state === 'opened' || (isOwner && state !== 'sealed' && state !== 'new')) {
      navigate(`/letters/${letter.id}`)
      return
    }
    setPresented(letter)
  }

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Letters</h1>
          <p className="font-hand text-hand text-rose-deep">Little envelopes for little moments.</p>
        </div>
        {isOwner && (
          <div className="hidden lg:block">
            <Fab label="New letter" onClick={() => setEditor({ isOpen: true, key: crypto.randomUUID() })} />
          </div>
        )}
      </header>

      {lockedNotice && (
        <p role="status" className="rounded-md bg-blush px-4 py-3 text-small font-semibold text-rose-deep">
          {lockedNotice}
        </p>
      )}

      {letters.isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-paper" />
          ))}
        </div>
      ) : letters.isError ? (
        <ErrorState onRetry={() => void letters.refetch()} />
      ) : letters.data.length === 0 ? (
        <EmptyState
          title={isOwner ? 'No letters yet' : 'Your letters are on their way'}
          message={isOwner ? 'Write the first envelope: "Open when…"' : undefined}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sortEnvelopes(letters.data, now).map((letter) => {
            const state = getEnvelopeState(letter, now)
            return (
              <li key={letter.id} className="relative">
                <Envelope
                  label={letter.label}
                  state={state}
                  caption={captionFor(letter, state, now, isOwner)}
                  onSelect={() => handleSelect(letter, state)}
                />
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setEditor({ isOpen: true, letter, key: letter.id + letter.updated_at })}
                    aria-label={`Edit ${letter.label}`}
                    className="absolute left-1.5 top-1.5 grid size-11 place-items-center rounded-full bg-surface/90 text-ink-soft shadow-soft hover:text-ink"
                  >
                    <Pencil aria-hidden className="size-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {isOwner && (
        <div className="lg:hidden">
          <Fab label="New letter" onClick={() => setEditor({ isOpen: true, key: crypto.randomUUID() })} />
        </div>
      )}

      {presented && (
        <EnvelopeOpening
          letter={presented}
          onCancel={() => setPresented(null)}
          onOpened={(letterId) => {
            setPresented(null)
            navigate(`/letters/${letterId}`)
          }}
        />
      )}

      {editor.isOpen && <LetterEditorSheet key={editor.key} letter={editor.letter} onClose={() => setEditor({ isOpen: false })} />}
    </div>
  )
}
