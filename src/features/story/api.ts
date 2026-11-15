import { supabase } from '@/lib/supabase/client'
import type { ContentStatus, Tables } from '@/lib/supabase/database.types'
import { removeMedia, uploadImage, type PhotoChange } from '@/lib/media/storage'
import { ApiError } from '@/features/relationship/api'

export type Milestone = Tables<'story_milestones'>

export interface MilestoneInput {
  title: string
  caption: string
  occurredOn: string
  isHighlighted: boolean
  sortOrder: number
  status: ContentStatus
}


/** Chronological: it's a story (PAGE-STRUCTURE §4.5). RLS hides drafts from the partner. */
export async function fetchMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('story_milestones')
    .select('*')
    .order('occurred_on', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new ApiError('Could not load our story', error)
  return data
}

function toRow(input: MilestoneInput) {
  return {
    title: input.title.trim(),
    caption: input.caption.trim(),
    occurred_on: input.occurredOn,
    is_highlighted: input.isHighlighted,
    sort_order: input.sortOrder,
    status: input.status,
  }
}

/** Upload first, then insert; if the insert fails the upload is removed (DATABASE-DESIGN §7). */
export async function createMilestone(input: MilestoneInput, photo: PhotoChange): Promise<void> {
  const id = crypto.randomUUID()
  const photoPath = photo.kind === 'replace' ? await uploadImage('story', id, photo.image) : null
  const { error } = await supabase.from('story_milestones').insert({ id, ...toRow(input), photo_path: photoPath })
  if (error) {
    await removeMedia([photoPath])
    throw new ApiError('Could not save the milestone', error)
  }
}

/** Replace: upload new → update row → delete old file. */
export async function updateMilestone(milestone: Milestone, input: MilestoneInput, photo: PhotoChange): Promise<void> {
  const newPath = photo.kind === 'replace' ? await uploadImage('story', milestone.id, photo.image) : undefined
  const photoPath = photo.kind === 'keep' ? milestone.photo_path : (newPath ?? null)
  const { error } = await supabase
    .from('story_milestones')
    .update({ ...toRow(input), photo_path: photoPath })
    .eq('id', milestone.id)
  if (error) {
    await removeMedia([newPath])
    throw new ApiError('Could not save the milestone', error)
  }
  if (photo.kind !== 'keep') await removeMedia([milestone.photo_path])
}

/** Delete row → delete file. */
export async function deleteMilestone(milestone: Milestone): Promise<void> {
  const { error } = await supabase.from('story_milestones').delete().eq('id', milestone.id)
  if (error) throw new ApiError('Could not delete the milestone', error)
  await removeMedia([milestone.photo_path])
}
