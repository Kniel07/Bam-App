import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Star } from 'lucide-react'
import { Polaroid } from '@/components/shared/Polaroid'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { useDisplayNameFor, useRelationship } from '@/features/relationship/hooks'
import { formatCalendarDate, todayInZone } from '@/lib/dates/format'
import { useMemoriesList, useMemory, useSetFeatured } from './hooks'
import { MemoryEditorSheet } from './MemoryEditorSheet'

/** Memory detail (PAGE-STRUCTURE §4.9): photo, caption, who added it, feature on Home, prev/next. */
export function MemoryDetailPage() {
  const { memoryId = '' } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const isOwner = useRole() === 'owner'
  const userId = auth.status === 'member' ? auth.userId : null
  const nameFor = useDisplayNameFor()
  const relationship = useRelationship()
  const memory = useMemory(memoryId)
  const list = useMemoriesList()
  const setFeatured = useSetFeatured()
  const [isEditing, setIsEditing] = useState(false)

  const items = list.data?.pages.flat() ?? []
  const index = items.findIndex((item) => item.id === memoryId)
  const newer = index > 0 ? items[index - 1] : undefined
  const older = index >= 0 ? items[index + 1] : undefined

  if (memory.isPending) return <Skeleton className="mx-auto aspect-[4/5] w-full max-w-md rounded-paper" />
  if (memory.isError) return <ErrorState onRetry={() => void memory.refetch()} />
  if (!memory.data) return <EmptyState title="This memory isn’t here anymore" action={<Link to="/memories" className="font-semibold text-rose-deep underline">All memories</Link>} />

  const item = memory.data
  const isMine = item.created_by === userId
  const canEdit = isMine
  const canDelete = isMine || isOwner

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link to="/memories" viewTransition className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-rose-deep">
        <ArrowLeft aria-hidden className="size-4" /> All memories
      </Link>

      <Polaroid path={item.photo_path} alt={item.caption || 'Memory photo'} withTape transitionName={`memory-${item.id}`} />

      <div className="flex flex-col items-center gap-1 text-center">
        {item.caption && <p className="font-hand text-hand-lg text-ink">{item.caption}</p>}
        <p className="text-small text-ink-soft">
          {formatCalendarDate(item.taken_on)} · added by {isMine ? 'you' : nameFor(item.created_by)}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant={item.is_featured ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={item.is_featured}
          isLoading={setFeatured.isPending}
          iconLeft={<Star aria-hidden className={`size-4 ${item.is_featured ? 'fill-current' : ''}`} />}
          onClick={() => setFeatured.mutate({ id: item.id, featured: !item.is_featured })}
        >
          {item.is_featured ? 'Featured on Home' : 'Feature on Home'}
        </Button>
        {canEdit && (
          <Button variant="secondary" size="sm" iconLeft={<Pencil aria-hidden className="size-4" />} onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
        {!canEdit && canDelete && (
          <Button variant="danger" size="sm" onClick={() => setIsEditing(true)}>
            Remove
          </Button>
        )}
      </div>

      <nav aria-label="Other memories" className="flex justify-between">
        {newer ? (
          <Link to={`/memories/${newer.id}`} viewTransition className="inline-flex min-h-11 items-center gap-1 text-small font-semibold text-rose-deep">
            <ChevronLeft aria-hidden className="size-4" /> Newer
          </Link>
        ) : (
          <span />
        )}
        {older && (
          <Link to={`/memories/${older.id}`} viewTransition className="inline-flex min-h-11 items-center gap-1 text-small font-semibold text-rose-deep">
            Older <ChevronRight aria-hidden className="size-4" />
          </Link>
        )}
      </nav>

      {isEditing && (
        <MemoryEditorSheet
          memory={item}
          defaultDate={todayInZone(relationship.data?.timezone ?? 'UTC')}
          canDelete={canDelete}
          onClose={() => setIsEditing(false)}
          onDeleted={() => navigate('/memories', { replace: true })}
        />
      )}
    </div>
  )
}
