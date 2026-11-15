import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { SIGNED_URL_TTL_SECONDS } from '@/lib/constants'
import type { CompressedImage } from './compressImage'

export const MEDIA_BUCKET = 'media'

export type MediaModule = 'story' | 'letters' | 'memories'

/** What should happen to a row's photo when saving it. */
export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; image: CompressedImage }

export class StorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'StorageError'
  }
}

/** Path convention `{module}/{rowId}/{random}.{ext}` (DATABASE-DESIGN §7). */
export function buildMediaPath(module: MediaModule, rowId: string, extension: string): string {
  return `${module}/${rowId}/${crypto.randomUUID()}.${extension}`
}

export async function uploadImage(module: MediaModule, rowId: string, image: CompressedImage): Promise<string> {
  const path = buildMediaPath(module, rowId, image.extension)
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, image.blob, {
    contentType: image.blob.type,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new StorageError('Could not upload the photo', error)
  return path
}

/** Best-effort delete; a failure leaves an orphan file, never broken data. */
export async function removeMedia(paths: (string | null | undefined)[]): Promise<void> {
  const existing = paths.filter((path): path is string => Boolean(path))
  if (existing.length === 0) return
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(existing)
  if (error) console.warn('Media cleanup failed; orphaned file(s) left in storage')
}

/**
 * Short-lived signed URL for a private file, cached a little under its
 * lifetime so galleries don't re-sign on every render (TD-010).
 */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signed-url', path],
    enabled: Boolean(path),
    staleTime: (SIGNED_URL_TTL_SECONDS - 300) * 1000,
    gcTime: SIGNED_URL_TTL_SECONDS * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(path as string, SIGNED_URL_TTL_SECONDS)
      if (error) throw new StorageError('Could not load the photo', error)
      return data.signedUrl
    },
  })
}
