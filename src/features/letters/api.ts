import { supabase } from '@/lib/supabase/client'
import type { ContentStatus, Tables, UnlockType } from '@/lib/supabase/database.types'
import { removeMedia, uploadImage, type PhotoChange } from '@/lib/media/storage'
import { ApiError } from '@/features/relationship/api'

/** Envelope fields only: safe for the partner to receive (FR-LETTER-08). */
export type Letter = Tables<'letters'>

/** Content the database releases through open_letter() only (TD-019). */
export interface OpenedLetter {
  letterId: string
  label: string
  body: string
  photoPath: string | null
  firstOpenedAt: string | null
  authorId: string | null
}

export interface LetterInput {
  label: string
  body: string
  unlockType: UnlockType
  unlockAt: string | null
  status: ContentStatus
}

export class LetterLockedError extends Error {
  constructor() {
    super('This letter is not available yet')
    this.name = 'LetterLockedError'
  }
}

/** Envelopes. RLS hides drafts from the partner; bodies are never selected here. */
export async function fetchLetters(): Promise<Letter[]> {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new ApiError('Could not load letters', error)
  return data
}

/**
 * Opens a letter through the database (records the partner's first opening).
 * The database refuses locked and draft letters with not_found (P0002).
 */
export async function openLetter(letterId: string): Promise<OpenedLetter> {
  const { data, error } = await supabase.rpc('open_letter', { p_letter_id: letterId })
  if (error) {
    if (error.code === 'P0002') throw new LetterLockedError()
    throw new ApiError('Could not open the letter', error)
  }
  const row = data[0]
  if (!row) throw new LetterLockedError()
  return {
    letterId: row.letter_id,
    label: row.label,
    body: row.body,
    photoPath: row.photo_path,
    firstOpenedAt: row.first_opened_at,
    authorId: row.author_id,
  }
}

/** Author's editor only: anyone else's request is refused by RLS (CR-01). */
export async function fetchLetterContentForAuthor(letterId: string) {
  const { data, error } = await supabase
    .from('letter_contents')
    .select('body, photo_path')
    .eq('letter_id', letterId)
    .maybeSingle()
  if (error) throw new ApiError('Could not load the letter', error)
  return data
}

function toEnvelopeRow(input: LetterInput) {
  return {
    label: input.label.trim(),
    unlock_type: input.unlockType,
    unlock_at: input.unlockType === 'scheduled' ? input.unlockAt : null,
    status: input.status,
  }
}

/**
 * Create: upload photo → insert envelope → insert content. Each step undoes the
 * previous ones on failure, so a half-saved letter never lingers.
 */
export async function createLetter(input: LetterInput, photo: PhotoChange): Promise<void> {
  const id = crypto.randomUUID()
  const photoPath = photo.kind === 'replace' ? await uploadImage('letters', id, photo.image) : null

  const envelope = await supabase.from('letters').insert({ id, ...toEnvelopeRow(input) })
  if (envelope.error) {
    await removeMedia([photoPath])
    throw new ApiError('Could not save the letter', envelope.error)
  }

  const content = await supabase.from('letter_contents').insert({ letter_id: id, body: input.body.trim(), photo_path: photoPath })
  if (content.error) {
    await supabase.from('letters').delete().eq('id', id)
    await removeMedia([photoPath])
    throw new ApiError('Could not save the letter', content.error)
  }
}

export async function updateLetter(
  letter: Letter,
  currentPhotoPath: string | null,
  input: LetterInput,
  photo: PhotoChange,
): Promise<void> {
  const newPath = photo.kind === 'replace' ? await uploadImage('letters', letter.id, photo.image) : undefined
  const photoPath = photo.kind === 'keep' ? currentPhotoPath : (newPath ?? null)

  const content = await supabase
    .from('letter_contents')
    .upsert({ letter_id: letter.id, body: input.body.trim(), photo_path: photoPath })
  if (content.error) {
    await removeMedia([newPath])
    throw new ApiError('Could not save the letter', content.error)
  }

  const envelope = await supabase.from('letters').update(toEnvelopeRow(input)).eq('id', letter.id)
  if (envelope.error) throw new ApiError('Could not save the letter', envelope.error)

  if (photo.kind !== 'keep') await removeMedia([currentPhotoPath])
}

/**
 * Deleting the envelope cascades to its content (DATABASE-DESIGN §3); then the file.
 * When the owner removes the partner's unopened letter, its photo path is
 * unknown to him (content is sealed), so the file may be orphaned (KI-07).
 */
export async function deleteLetter(letter: Letter, photoPath: string | null): Promise<void> {
  const { error } = await supabase.from('letters').delete().eq('id', letter.id)
  if (error) throw new ApiError('Could not delete the letter', error)
  await removeMedia([photoPath])
}
