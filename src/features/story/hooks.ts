import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMilestone,
  deleteMilestone,
  fetchMilestones,
  updateMilestone,
  type Milestone,
  type MilestoneInput,
} from './api'
import type { PhotoChange } from '@/lib/media/storage'

export const storyKeys = { milestones: ['story-milestones'] as const }

export function useMilestones() {
  return useQuery({ queryKey: storyKeys.milestones, queryFn: fetchMilestones })
}

export function useSaveMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ existing, input, photo }: { existing?: Milestone; input: MilestoneInput; photo: PhotoChange }) =>
      existing ? updateMilestone(existing, input, photo) : createMilestone(input, photo),
    onSettled: () => queryClient.invalidateQueries({ queryKey: storyKeys.milestones }),
  })
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMilestone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: storyKeys.milestones }),
  })
}
