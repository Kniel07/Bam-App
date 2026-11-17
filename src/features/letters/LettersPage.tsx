import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Envelope, type EnvelopeVisualState } from '@/components/shared/Envelope'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Fab } from '@/components/ui/Fab'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { formatCountdown } from '@/features/monthsary/formatCountdown'
import { useNames } from '@/features/relationship/hooks'
import { copy } from '@/lib/copy'
import { useNow } from '@/lib/time/useNow'
import { staggerStyle } from '@/lib/stagger'
import type { Letter } from './api'
import { EnvelopeOpening } from './EnvelopeOpening'
import { useDeleteLetter, useLetters } from './hooks'
import { LetterEditorSheet } from './LetterEditorSheet'
import { getEnvelopeState, isWrittenBy, sortEnvelopes, type EnvelopeState } from './logic'

type EditorState = { isOpen: false } | { isOpen: true; letter?: Letter; key: string }

/** Caption for a letter written FOR the viewer. */
function captionForRecipient(letter: Letter, state: EnvelopeState, now: Date): string | undefined {
  if (state === 'locked' && letter.unlock_at) return `opens ${formatCountdown(new Date(letter.unlock_at), now)}`
  if (state === 'opened') return 'opened'
  if (state === 'new') return 'just unlocked'
  return undefined
}

/** Caption for a letter written BY the viewer. */
function captionForAuthor(letter: Letter, state: EnvelopeState, now: Date, recipientName: string): string {
  if (state === 'draft') return letter.unlock_type === 'scheduled' ? 'draft · on a date' : 'draft · anytime'
  if (state === 'locked' && letter.unlock_at) return `opens ${formatCountdown(new Date(letter.unlock_at), now)}`
  if (state === 'opened') return `opened by ${recipientName}`
  return 'not opened yet'
}

/** Authors see their own letters calmly: no "New" glow, sealed until read. */
function authorVisualState(state: EnvelopeState): EnvelopeVisualState {
  return state === 'new' ? 'sealed' : state
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-sans text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">
      {children}
    </h2>
  )
}

/** Letters (PAGE-STRUCTURE §4.6, FR-LETTER-01…10). Both members write letters for each other (CR-01). */
export function LettersPage() {
  const letters = useLetters()
  const { auth } = useAuth()
  const isOwner = useRole() === 'owner'
  const userId = auth.status === 'member' ? auth.userId : null
  const names = useNames()
  // The recipient of the viewer's letters is the other member.
  const recipientName = isOwner ? names.partner : names.owner
  const now = useNow()
  const navigate = useNavigate()
  const remove = useDeleteLetter()
  const [presented, setPresented] = useState<Letter | null>(null)
  const [lockedNotice, setLockedNotice] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ isOpen: false })
  const [removing, setRemoving] = useState<Letter | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const sorted = letters.data ? sortEnvelopes(letters.data, now) : []
  const forMe = sorted.filter((letter) => !isWrittenBy(letter, userId))
  const byMe = sorted.filter((letter) => isWrittenBy(letter, userId))

  function openForRecipient(letter: Letter, state: EnvelopeState) {
    setLockedNotice(null)
    if (state === 'locked') {
      setLockedNotice(`Not yet… ${captionForRecipient(letter, state, now) ?? ''}`.trim())
      return
    }
    if (state === 'opened') {
      navigate(`/letters/${letter.id}`)
      return
    }
    setPresented(letter)
  }

  async function confirmRemove() {
    if (!removing) return
    setRemoveError(null)
    try {
      await remove.mutateAsync({ letter: removing, photoPath: null })
      setRemoving(null)
    } catch {
      setRemoving(null)
      setRemoveError(copy.errors.generic)
    }
  }

  const newLetter = () => setEditor({ isOpen: true, key: crypto.randomUUID() })

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Letters</h1>
          <p className="font-hand text-hand text-rose-deep">Little envelopes for little moments.</p>
        </div>
        <div className="hidden lg:block">
          <Fab label="New letter" onClick={newLetter} />
        </div>
      </header>

      {(lockedNotice || removeError) && (
        <p role="status" className="rounded-md bg-blush px-4 py-3 text-small font-semibold text-rose-deep">
          {lockedNotice ?? removeError}
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
      ) : (
        <>
          <section aria-labelledby="for-you-heading" className="flex flex-col gap-3">
            <SectionHeading id="for-you-heading">For you</SectionHeading>
            {forMe.length === 0 ? (
              <EmptyState title="Your letters are on their way" />
            ) : (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {forMe.map((letter, index) => {
                  const state = getEnvelopeState(letter, now)
                  return (
                    <li key={letter.id} className="relative animate-rise-in" style={staggerStyle(index)}>
                      <Envelope
                        label={letter.label}
                        state={state}
                        caption={captionForRecipient(letter, state, now)}
                        onSelect={() => openForRecipient(letter, state)}
                      />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setRemoving(letter)}
                          aria-label={`Remove ${letter.label}`}
                          className="absolute left-1.5 top-1.5 grid size-11 place-items-center rounded-full bg-surface/90 text-ink-soft shadow-soft hover:text-error"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="by-you-heading" className="flex flex-col gap-3">
            <SectionHeading id="by-you-heading">Written by you</SectionHeading>
            {byMe.length === 0 ? (
              <EmptyState title="Write the first one" message='Start an envelope: "Open when…"' />
            ) : (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {byMe.map((letter, index) => {
                  const state = getEnvelopeState(letter, now)
                  return (
                    <li key={letter.id} className="relative animate-rise-in" style={staggerStyle(index)}>
                      <Envelope
                        label={letter.label}
                        state={authorVisualState(state)}
                        caption={captionForAuthor(letter, state, now, recipientName)}
                        onSelect={() => navigate(`/letters/${letter.id}`)}
                      />
                      <button
                        type="button"
                        onClick={() => setEditor({ isOpen: true, letter, key: letter.id + letter.updated_at })}
                        aria-label={`Edit ${letter.label}`}
                        className="absolute left-1.5 top-1.5 grid size-11 place-items-center rounded-full bg-surface/90 text-ink-soft shadow-soft hover:text-ink"
                      >
                        <Pencil aria-hidden className="size-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="lg:hidden">
        <Fab label="New letter" onClick={newLetter} />
      </div>

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

      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this letter?"
        message={`"${removing?.label ?? ''}" will be deleted for both of you. This can't be undone.`}
        confirmLabel="Remove"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
