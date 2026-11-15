import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Sheet } from '@/components/ui/Sheet'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { Toggle } from '@/components/ui/Toggle'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import type { PhotoChange } from '@/lib/media/storage'
import { copy } from '@/lib/copy'
import type { Milestone } from './api'
import { useDeleteMilestone, useSaveMilestone } from './hooks'

interface MilestoneEditorSheetProps {
  isOpen: boolean
  milestone?: Milestone
  defaultDate: string
  onClose: () => void
}

/** Owner editor for a story milestone (F9, FR-STORY-03/04). */
export function MilestoneEditorSheet({ isOpen, milestone, defaultDate, onClose }: MilestoneEditorSheetProps) {
  const [title, setTitle] = useState(milestone?.title ?? '')
  const [caption, setCaption] = useState(milestone?.caption ?? '')
  const [occurredOn, setOccurredOn] = useState(milestone?.occurred_on ?? defaultDate)
  const [sortOrder, setSortOrder] = useState(String(milestone?.sort_order ?? 0))
  const [isHighlighted, setIsHighlighted] = useState(milestone?.is_highlighted ?? false)
  const [isPublished, setIsPublished] = useState(milestone ? milestone.status === 'published' : false)
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' })
  const [error, setError] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const save = useSaveMilestone()
  const remove = useDeleteMilestone()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await save.mutateAsync({
        existing: milestone,
        input: {
          title,
          caption,
          occurredOn,
          isHighlighted,
          sortOrder: Number.parseInt(sortOrder, 10) || 0,
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
    if (!milestone) return
    try {
      await remove.mutateAsync(milestone)
      setIsConfirmingDelete(false)
      onClose()
    } catch {
      setIsConfirmingDelete(false)
      setError(copy.errors.generic)
    }
  }

  return (
    <>
      <Sheet isOpen={isOpen && !isConfirmingDelete} onClose={onClose} title={milestone ? 'Edit milestone' : 'New milestone'}>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <TextField label="Title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required />
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <TextField label="Date" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} required />
            <TextField
              label="Order"
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              hint="Same day"
            />
          </div>
          <TextArea label="Caption" rows={4} maxLength={2000} value={caption} onChange={(event) => setCaption(event.target.value)} />
          <PhotoPicker existingPath={milestone?.photo_path ?? null} value={photo} onChange={setPhoto} label="Photo (optional)" />
          <Toggle label="Highlight" description="Anniversary-style emphasis on the timeline." checked={isHighlighted} onChange={setIsHighlighted} />
          <Toggle
            label="Published"
            description={isPublished ? 'Visible to her.' : 'Draft: only you can see it.'}
            checked={isPublished}
            onChange={setIsPublished}
          />
          {error && (
            <p role="alert" className="text-small text-error">
              {error}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {milestone ? (
              <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" isLoading={save.isPending} disabled={!title.trim() || !occurredOn}>
              {milestone ? 'Save changes' : 'Add milestone'}
            </Button>
          </div>
        </form>
      </Sheet>
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="Delete milestone?"
        message="This removes it from our story, including its photo. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  )
}
