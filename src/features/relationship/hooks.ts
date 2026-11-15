import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import {
  fetchMembers,
  fetchRelationship,
  markWelcomed,
  updateDisplayName,
  updateRelationship,
  type Member,
  type RelationshipUpdate,
} from './api'

export const relationshipKeys = {
  relationship: ['relationship'] as const,
  members: ['members'] as const,
}

const FIVE_MINUTES = 5 * 60_000

export function useRelationship() {
  return useQuery({ queryKey: relationshipKeys.relationship, queryFn: fetchRelationship, staleTime: FIVE_MINUTES })
}

export function useMembers() {
  return useQuery({ queryKey: relationshipKeys.members, queryFn: fetchMembers, staleTime: FIVE_MINUTES })
}

/** Display names by role, with neutral fallbacks until the owner sets them. */
export function useNames() {
  const { data } = useMembers()
  const find = (role: Member['role']) => data?.find((member) => member.role === role)
  return {
    owner: find('owner')?.displayName || 'me',
    partner: find('partner')?.displayName || 'you',
  }
}

/** Display name for a member's user id, with a neutral fallback. */
export function useDisplayNameFor(): (userId: string | null | undefined) => string {
  const { data } = useMembers()
  return (userId) => {
    const member = data?.find((candidate) => candidate.userId === userId)
    if (!member) return 'someone'
    return member.displayName || (member.role === 'owner' ? 'me' : 'you')
  }
}

/** The signed-in member's own record. */
export function useCurrentMember(): Member | undefined {
  const { auth } = useAuth()
  const { data } = useMembers()
  if (auth.status !== 'member') return undefined
  return data?.find((member) => member.userId === auth.userId)
}

export function useUpdateRelationship() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: Partial<RelationshipUpdate> }) => updateRelationship(id, update),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relationshipKeys.relationship }),
  })
}

export function useUpdateDisplayNames() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (names: { userId: string; displayName: string }[]) =>
      Promise.all(names.map(({ userId, displayName }) => updateDisplayName(userId, displayName))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relationshipKeys.members }),
  })
}

export function useMarkWelcomed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markWelcomed,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relationshipKeys.members }),
  })
}
