import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import type { CompressedImage } from '@/lib/media/compressImage'
import { removeMedia, uploadImage, type PhotoChange } from '@/lib/media/storage'
import { MEMORIES_PAGE_SIZE } from '@/lib/constants'
import { ApiError } from '@/features/relationship/api'
import { pokeNotifier } from '@/features/nudges/api'

export type Memory = Tables<'memories'>

export interface MemoryInput {
  caption: string
  takenOn: string
}

/** A page of the scrapbook, newest first (PAGE-STRUCTURE §4.8). */
export async function fetchMemoriesPage(page: number): Promise<Memory[]> {
  const from = page * MEMORIES_PAGE_SIZE
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('taken_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + MEMORIES_PAGE_SIZE - 1)
  if (error) throw new ApiError('Could not load memories', error)
  return data
}

export async function fetchMemory(id: string): Promise<Memory | null> {
  const { data, error } = await supabase.from('memories').select('*').eq('id', id).maybeSingle()
  if (error) throw new ApiError('Could not load the memory', error)
  return data
}

/** Featured memories for Home (CR-03), most recently featured first. */
export async function fetchFeaturedMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('is_featured', true)
    .order('featured_at', { ascending: false })
    .limit(12)
  if (error) throw new ApiError('Could not load featured memories', error)
  return data
}

/** Upload first, then insert; the upload is removed if the insert fails (DATABASE-DESIGN §7). */
export async function createMemory(input: MemoryInput, image: CompressedImage): Promise<void> {
  const id = crypto.randomUUID()
  const photoPath = await uploadImage('memories', id, image)
  const { error } = await supabase
    .from('memories')
    .insert({ id, caption: input.caption.trim(), taken_on: input.takenOn, photo_path: photoPath, status: 'published' })
  if (error) {
    await removeMedia([photoPath])
    throw new ApiError('Could not save the memory', error)
  }
  pokeNotifier()
}

/** Replace: upload new → update row → delete old file. */
export async function updateMemory(memory: Memory, input: MemoryInput, photo: PhotoChange): Promise<void> {
  const newPath = photo.kind === 'replace' ? await uploadImage('memories', memory.id, photo.image) : undefined
  const { error } = await supabase
    .from('memories')
    .update({ caption: input.caption.trim(), taken_on: input.takenOn, photo_path: newPath ?? memory.photo_path })
    .eq('id', memory.id)
  if (error) {
    await removeMedia([newPath])
    throw new ApiError('Could not save the memory', error)
  }
  if (newPath) await removeMedia([memory.photo_path])
}

export async function deleteMemory(memory: Memory): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', memory.id)
  if (error) throw new ApiError('Could not delete the memory', error)
  await removeMedia([memory.photo_path])
}

/** Either member can feature any visible memory (CR-03); no edit rights implied. */
export async function setMemoryFeatured(id: string, featured: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_memory_featured', { p_memory_id: id, p_featured: featured })
  if (error) throw new ApiError('Could not update featured photos', error)
}
