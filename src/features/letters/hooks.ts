import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PhotoChange } from '@/lib/media/storage'
import {
  createLetter,
  deleteLetter,
  fetchLetterContentForOwner,
  fetchLetters,
  openLetter,
  updateLetter,
  type Letter,
  type LetterInput,
  type OpenedLetter,
} from './api'

export const letterKeys = {
  all: ['letters'] as const,
  opened: (letterId: string) => ['letters', 'opened', letterId] as const,
  ownerContent: (letterId: string) => ['letters', 'owner-content', letterId] as const,
}

export function useLetters() {
  return useQuery({ queryKey: letterKeys.all, queryFn: fetchLetters })
}

/**
 * Content of an opened letter. Cached after the ceremony so the reading view
 * doesn't ask twice; a direct visit asks the database (which re-checks locks).
 */
export function useOpenedLetter(letterId: string) {
  return useQuery({
    queryKey: letterKeys.opened(letterId),
    queryFn: () => openLetter(letterId),
    staleTime: Infinity,
    retry: false,
  })
}

export function useOpenLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: openLetter,
    onSuccess: (opened: OpenedLetter) => {
      queryClient.setQueryData(letterKeys.opened(opened.letterId), opened)
      void queryClient.invalidateQueries({ queryKey: letterKeys.all, exact: true })
    },
  })
}

export function useOwnerLetterContent(letterId: string | undefined) {
  return useQuery({
    queryKey: letterKeys.ownerContent(letterId ?? 'new'),
    queryFn: () => fetchLetterContentForOwner(letterId as string),
    enabled: Boolean(letterId),
  })
}

export function useSaveLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      existing,
      currentPhotoPath,
      input,
      photo,
    }: {
      existing?: Letter
      currentPhotoPath: string | null
      input: LetterInput
      photo: PhotoChange
    }) => (existing ? updateLetter(existing, currentPhotoPath, input, photo) : createLetter(input, photo)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: letterKeys.all }),
  })
}

export function useDeleteLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ letter, photoPath }: { letter: Letter; photoPath: string | null }) => deleteLetter(letter, photoPath),
    onSettled: () => queryClient.invalidateQueries({ queryKey: letterKeys.all }),
  })
}
