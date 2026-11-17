import { useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { CompressedImage } from '@/lib/media/compressImage'
import type { PhotoChange } from '@/lib/media/storage'
import { MEMORIES_PAGE_SIZE } from '@/lib/constants'
import {
  createMemory,
  deleteMemory,
  fetchFeaturedMemories,
  fetchMemoriesPage,
  fetchMemory,
  setMemoryFeatured,
  updateMemory,
  type Memory,
  type MemoryInput,
} from './api'

export const memoryKeys = {
  all: ['memories'] as const,
  list: ['memories', 'list'] as const,
  featured: ['memories', 'featured'] as const,
  one: (id: string) => ['memories', 'one', id] as const,
}

/** Live refresh while the app is open (Realtime; RLS applies). */
export function useLiveMemories() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('memories-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, () => {
        void queryClient.invalidateQueries({ queryKey: memoryKeys.all })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])
}

export function useMemoriesList() {
  return useInfiniteQuery({
    queryKey: memoryKeys.list,
    queryFn: ({ pageParam }) => fetchMemoriesPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.length === MEMORIES_PAGE_SIZE ? pages.length : undefined),
  })
}

export function useMemory(id: string) {
  return useQuery({ queryKey: memoryKeys.one(id), queryFn: () => fetchMemory(id) })
}

export function useFeaturedMemories() {
  return useQuery({ queryKey: memoryKeys.featured, queryFn: fetchFeaturedMemories })
}

export function useSaveMemory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      existing,
      input,
      photo,
    }: {
      existing?: Memory
      input: MemoryInput
      photo: PhotoChange
    }) => {
      if (existing) return updateMemory(existing, input, photo)
      if (photo.kind !== 'replace') throw new Error('A photo is required')
      return createMemory(input, photo.image as CompressedImage)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: memoryKeys.all }),
  })
}

export function useDeleteMemory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMemory,
    onSettled: () => queryClient.invalidateQueries({ queryKey: memoryKeys.all }),
  })
}

export function useSetFeatured() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => setMemoryFeatured(id, featured),
    onSettled: () => queryClient.invalidateQueries({ queryKey: memoryKeys.all }),
  })
}
