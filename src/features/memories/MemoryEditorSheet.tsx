import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Sheet } from '@/components/ui/Sheet'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import type { PhotoChange } from '@/lib/media/storage'
import { copy } from '@/lib/copy'
import type { Memory } from './api'
import { useDeleteMemory, useSaveMemory } from './hooks'

interface MemoryEditorSheetProps {
  memory?: Memory
  defaultDate: string
  canDelete: boolean
  onClose: () => void
  onDeleted?: () => void
}

/** Add or edit a memory (F6/F7). A photo is required; it's compressed on the phone first. */
export function MemoryEditorSheet({ memory, defaultDate, canDelete, onClose, onDeleted }: MemoryEditorSheetProps) {
  const [caption, setCaption] = useState(memory?.caption ?? '')
  const [takenOn, setTakenOn] = useState(memory?.taken_on ?? defaultDate)
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' })
  const [error, setError] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const save = useSaveMemory()
  const remove = useDeleteMemory()

  const hasPhoto = memory ? true : photo.kind === 'replace'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await save.mutateAsync({ existing: memory, input: { caption, takenOn }, photo })
      onClose()
    } catch {
      setError(copy.errors.generic)
    }
  }

  async function handleDelete() {
    if (!memory) return
    try {
      await remove.mutateAsync(memory)
      setIsConfirmingDelete(false)
      onClose()
      onDeleted?.()
    } catch {
      setIsConfirmingDelete(false)
      setError(copy.errors.generic)
    }
  }

  return (
    <>
      <Sheet isOpen={!isConfirmingDelete} onClose={onClose} title={memory ? 'Edit memory' : 'New memory'}>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <PhotoPicker existingPath={memory?.photo_path ?? null} value={photo} onChange={setPhoto} isRequired label="Photo" />
          <TextArea label="Caption" rows={2} maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} />
          <TextField label="Date" type="date" value={takenOn} onChange={(event) => setTakenOn(event.target.value)} required />
          {save.isPending && <p className="font-hand text-hand text-rose-deep">Tucking your photo into the scrapbook…</p>}
          {error && (
            <p role="alert" className="text-small text-error">
              {error}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {memory && canDelete ? (
              <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" isLoading={save.isPending} disabled={!hasPhoto || !takenOn}>
              {memory ? 'Save changes' : 'Save memory'}
            </Button>
          </div>
        </form>
      </Sheet>
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="Remove this memory?"
        message="The photo and caption will be removed for both of you. This can't be undone."
        confirmLabel="Remove"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  )
}
