import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Sheet } from '@/components/ui/Sheet'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { Toggle } from '@/components/ui/Toggle'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import { useRelationship } from '@/features/relationship/hooks'
import { getNextMonthsary, instantToZonedWallTime, zonedWallTimeToInstant } from '@/lib/dates/monthsary'
import type { PhotoChange } from '@/lib/media/storage'
import type { UnlockType } from '@/lib/supabase/database.types'
import { copy } from '@/lib/copy'
import type { Letter } from './api'
import { useDeleteLetter, useOwnerLetterContent, useSaveLetter } from './hooks'

interface LetterEditorSheetProps {
  letter?: Letter
  onClose: () => void
}

interface FormProps extends LetterEditorSheetProps {
  initialBody: string
  initialPhotoPath: string | null
  timeZone: string
  defaultUnlock: { date: string; time: string }
}

function LetterForm({ letter, onClose, initialBody, initialPhotoPath, timeZone, defaultUnlock }: FormProps) {
  const initialUnlock = letter?.unlock_at ? instantToZonedWallTime(new Date(letter.unlock_at), timeZone) : defaultUnlock
  const [label, setLabel] = useState(letter?.label ?? 'Open when ')
  const [body, setBody] = useState(initialBody)
  const [unlockType, setUnlockType] = useState<UnlockType>(letter?.unlock_type ?? 'on_demand')
  const [unlockDate, setUnlockDate] = useState(initialUnlock.date)
  const [unlockTime, setUnlockTime] = useState(initialUnlock.time)
  const [isPublished, setIsPublished] = useState(letter ? letter.status === 'published' : false)
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' })
  const [error, setError] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const save = useSaveLetter()
  const remove = useDeleteLetter()

  const unlockPreview =
    unlockType === 'scheduled' && unlockDate && unlockTime
      ? new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: 'full', timeStyle: 'short' }).format(
          zonedWallTimeToInstant(unlockDate, unlockTime, timeZone),
        )
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await save.mutateAsync({
        existing: letter,
        currentPhotoPath: initialPhotoPath,
        input: {
          label,
          body,
          unlockType,
          unlockAt: unlockType === 'scheduled' ? zonedWallTimeToInstant(unlockDate, unlockTime, timeZone).toISOString() : null,
          status: isPublished ? 'published' : 'draft',
        },
        photo,
      })
      onClose()
    } catch {
      setError(copy.errors.generic)
    }
  }

  async function handleDelete() {
    if (!letter) return
    try {
      await remove.mutateAsync({ letter, photoPath: initialPhotoPath })
      onClose()
    } catch {
      setIsConfirmingDelete(false)
      setError(copy.errors.generic)
    }
  }

  return (
    <>
      <Sheet isOpen={!isConfirmingDelete} onClose={onClose} title={letter ? 'Edit letter' : 'New letter'}>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <TextField
            label="Envelope label"
            value={label}
            maxLength={80}
            onChange={(event) => setLabel(event.target.value)}
            hint='e.g. "Open when you miss me"'
            required
          />
          <TextArea label="Letter" rows={10} maxLength={20000} value={body} onChange={(event) => setBody(event.target.value)} required />
          <PhotoPicker existingPath={initialPhotoPath} value={photo} onChange={setPhoto} label="Photo (optional)" />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-small font-semibold text-ink">Can be opened</legend>
            {(
              [
                ['on_demand', 'Anytime', 'For a feeling: "when you’re sad", "when you can’t sleep".'],
                ['scheduled', 'On a date', 'Stays locked until the moment you choose.'],
              ] as const
            ).map(([value, title, description]) => (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-sm border px-4 py-3 ${unlockType === value ? 'border-rose-deep bg-blush' : 'border-line bg-surface'}`}
              >
                <input
                  type="radio"
                  name="unlock-type"
                  value={value}
                  checked={unlockType === value}
                  onChange={() => setUnlockType(value)}
                  className="mt-1 accent-[var(--color-rose-deep)]"
                />
                <span>
                  <span className="block text-body font-semibold text-ink">{title}</span>
                  <span className="block text-small text-ink-soft">{description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {unlockType === 'scheduled' && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Unlock date" type="date" value={unlockDate} onChange={(event) => setUnlockDate(event.target.value)} required />
                <TextField label="Time" type="time" value={unlockTime} onChange={(event) => setUnlockTime(event.target.value)} required />
              </div>
              {unlockPreview && (
                <p className="rounded-sm bg-blush px-4 py-3 text-small text-rose-deep">
                  Opens {unlockPreview} ({timeZone})
                </p>
              )}
            </div>
          )}

          <Toggle
            label="Published"
            description={
              isPublished
                ? unlockType === 'scheduled'
                  ? 'She sees the envelope now; the letter stays locked until its moment.'
                  : 'She can see and open it.'
                : 'Draft: only you can see it.'
            }
            checked={isPublished}
            onChange={setIsPublished}
          />

          {error && (
            <p role="alert" className="text-small text-error">
              {error}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {letter ? (
              <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" isLoading={save.isPending} disabled={!label.trim() || !body.trim()}>
              {letter ? 'Save changes' : 'Add letter'}
            </Button>
          </div>
        </form>
      </Sheet>
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="Delete letter?"
        message="The envelope, the letter and its photo will be gone. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  )
}

/** Owner letter editor (F8, FR-LETTER-07). Loads the existing content first when editing. */
export function LetterEditorSheet({ letter, onClose }: LetterEditorSheetProps) {
  const relationship = useRelationship()
  const content = useOwnerLetterContent(letter?.id)
  const isLoading = relationship.isPending || (letter !== undefined && content.isPending)

  if (isLoading) {
    return (
      <Sheet isOpen onClose={onClose} title={letter ? 'Edit letter' : 'New letter'}>
        <Skeleton className="h-64" />
      </Sheet>
    )
  }
  if (relationship.isError || !relationship.data || content.isError) {
    return (
      <Sheet isOpen onClose={onClose} title="Letter">
        <ErrorState onRetry={() => void Promise.all([relationship.refetch(), content.refetch()])} />
      </Sheet>
    )
  }

  const { timezone, start_at: startAt } = relationship.data
  // Default unlock: the next monthsary, at the anchor's minute (TD-011).
  const nextMonthsary = getNextMonthsary(new Date(startAt), new Date(), timezone)

  return (
    <LetterForm
      letter={letter}
      onClose={onClose}
      initialBody={content.data?.body ?? ''}
      initialPhotoPath={content.data?.photo_path ?? null}
      timeZone={timezone}
      defaultUnlock={instantToZonedWallTime(nextMonthsary.at, timezone)}
    />
  )
}
