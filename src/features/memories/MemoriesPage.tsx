import { useState } from 'react'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { Polaroid } from '@/components/shared/Polaroid'
import { Button } from '@/components/ui/Button'
import { Fab } from '@/components/ui/Fab'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useRelationship } from '@/features/relationship/hooks'
import { formatCalendarDate, todayInZone } from '@/lib/dates/format'
import { staggerStyle } from '@/lib/stagger'
import { useLiveMemories, useMemoriesList } from './hooks'
import { MemoryEditorSheet } from './MemoryEditorSheet'

/** Our Memories (PAGE-STRUCTURE §4.8, FR-MEM-01…05/07/08). Both members add memories. */
export function MemoriesPage() {
  useLiveMemories()
  const memories = useMemoriesList()
  const relationship = useRelationship()
  const [editorKey, setEditorKey] = useState<string | null>(null)
  const timeZone = relationship.data?.timezone ?? 'UTC'
  const items = memories.data?.pages.flat() ?? []

  const add = () => setEditorKey(crypto.randomUUID())

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Our Memories</h1>
          <p className="font-hand text-hand text-rose-deep">A scrapbook that keeps growing.</p>
        </div>
        <div className="hidden lg:block">
          <Fab label="Add memory" onClick={add} />
        </div>
      </header>

      {memories.isPending ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/5.2] rounded-paper" />
          ))}
        </div>
      ) : memories.isError ? (
        <ErrorState onRetry={() => void memories.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="No memories here yet" message="Let’s make the first one." action={<Button onClick={add}>Add a memory</Button>} />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
            {items.map((memory, index) => (
              <li key={memory.id} className="animate-rise-in" style={staggerStyle(index)}>
                <Link
                  to={`/memories/${memory.id}`}
                  viewTransition
                  aria-label={`${memory.caption || 'Memory'}, ${formatCalendarDate(memory.taken_on, 'medium')}`}
                  className="relative block transition-transform active:scale-[0.97]"
                >
                  <Polaroid path={memory.photo_path} alt={memory.caption || 'Memory photo'} caption={memory.caption || undefined} tiltSeed={memory.id} transitionName={`memory-${memory.id}`} />
                  {memory.is_featured && (
                    <span className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-rose-deep text-white shadow-soft">
                      <Star aria-label="featured on Home" className="size-4 fill-current" />
                    </span>
                  )}
                  <span className="mt-2 block text-center text-small text-ink-soft">{formatCalendarDate(memory.taken_on, 'medium')}</span>
                </Link>
              </li>
            ))}
          </ul>
          {memories.hasNextPage && (
            <Button variant="secondary" className="self-center" isLoading={memories.isFetchingNextPage} onClick={() => void memories.fetchNextPage()}>
              Show more
            </Button>
          )}
        </>
      )}

      <div className="lg:hidden">
        <Fab label="Add memory" onClick={add} />
      </div>

      {editorKey && <MemoryEditorSheet key={editorKey} defaultDate={todayInZone(timeZone)} canDelete={false} onClose={() => setEditorKey(null)} />}
    </div>
  )
}
