import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { compressImage, ImageProcessingError, type CompressedImage } from '@/lib/media/compressImage'
import type { PhotoChange } from '@/lib/media/storage'
import { Polaroid } from './Polaroid'

const PHOTO_ERRORS: Record<ImageProcessingError['reason'], string> = {
  'not-an-image': 'That file isn’t a photo. Try a JPG or PNG.',
  'too-large': 'That photo is too large (over 30 MB).',
  unreadable: 'This photo type isn’t supported here. Try a JPG or PNG.',
}

interface PhotoPickerProps {
  /** Current stored photo, if any. */
  existingPath: string | null
  value: PhotoChange
  onChange: (change: PhotoChange) => void
  /** Required photos (memories) can't be removed, only replaced. */
  isRequired?: boolean
  label?: string
}

/** Choose / replace / remove a photo, compressed in the browser before upload (F6). */
export function PhotoPicker({ existingPath, value, onChange, isRequired = false, label = 'Photo' }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setIsProcessing(true)
    try {
      const image: CompressedImage = await compressImage(file)
      setPreviewUrl(URL.createObjectURL(image.blob))
      onChange({ kind: 'replace', image })
    } catch (caught) {
      setError(caught instanceof ImageProcessingError ? PHOTO_ERRORS[caught.reason] : PHOTO_ERRORS.unreadable)
    } finally {
      setIsProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const showsExisting = value.kind === 'keep' && existingPath
  const showsNew = value.kind === 'replace' && previewUrl
  const hasPhoto = Boolean(showsExisting || showsNew)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-semibold text-ink">{label}</span>
      {hasPhoto ? (
        <div className="flex items-end gap-4">
          <div className="w-32">
            {showsNew ? <Polaroid localSrc={previewUrl} alt="Selected photo" withTape={false} /> : <Polaroid path={existingPath} alt="Current photo" withTape={false} />}
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => inputRef.current?.click()} className="min-h-11 text-left text-small font-semibold text-rose-deep">
              Replace photo
            </button>
            {!isRequired && (
              <button
                type="button"
                onClick={() => onChange({ kind: 'remove' })}
                className="flex min-h-11 items-center gap-1.5 text-left text-small text-ink-soft"
              >
                <Trash2 aria-hidden className="size-4" /> Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-petal bg-cream text-small font-semibold text-rose-deep disabled:opacity-60"
        >
          <ImagePlus aria-hidden className="size-6" />
          {isProcessing ? 'Preparing photo…' : 'Choose a photo'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-small text-error">
          {error}
        </p>
      )}
    </div>
  )
}
