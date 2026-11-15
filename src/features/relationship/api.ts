import { supabase } from '@/lib/supabase/client'
import type { MemberRole, Tables } from '@/lib/supabase/database.types'

export type Relationship = Tables<'relationship'>

export interface Member {
  userId: string
  role: MemberRole
  displayName: string
  welcomedAt: string | null
}

/** Typed failure for the UI; the original Supabase error is kept as `cause`. */
export class ApiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'ApiError'
  }
}

/** The single relationship row, or null if provisioning hasn't been done yet. */
export async function fetchRelationship(): Promise<Relationship | null> {
  const { data, error } = await supabase.from('relationship').select('*').maybeSingle()
  if (error) throw new ApiError('Could not load relationship settings', error)
  return data
}

export async function fetchMembers(): Promise<Member[]> {
  const [members, profiles] = await Promise.all([
    supabase.from('relationship_members').select('user_id, role'),
    supabase.from('profiles').select('id, display_name, welcomed_at'),
  ])
  if (members.error) throw new ApiError('Could not load members', members.error)
  if (profiles.error) throw new ApiError('Could not load profiles', profiles.error)
  return members.data.map((member) => {
    const profile = profiles.data.find((candidate) => candidate.id === member.user_id)
    return {
      userId: member.user_id,
      role: member.role,
      displayName: profile?.display_name ?? '',
      welcomedAt: profile?.welcomed_at ?? null,
    }
  })
}

export type RelationshipUpdate = Pick<
  Relationship,
  'start_at' | 'timezone' | 'counter_message' | 'welcome_message' | 'intro_story'
>

export async function updateRelationship(id: string, update: Partial<RelationshipUpdate>): Promise<void> {
  const { error } = await supabase.from('relationship').update(update).eq('id', id)
  if (error) throw new ApiError('Could not save settings', error)
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId)
  if (error) throw new ApiError('Could not save name', error)
}

export async function markWelcomed(): Promise<void> {
  const { error } = await supabase.rpc('mark_welcomed')
  if (error) throw new ApiError('Could not record welcome', error)
}

export async function fetchServerTime(): Promise<Date> {
  const { data, error } = await supabase.rpc('get_server_time')
  if (error) throw new ApiError('Could not read server time', error)
  return new Date(data)
}
