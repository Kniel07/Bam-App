import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DraftBadge } from '@/components/shared/DraftBadge'
import { Heart, Sparkle } from '@/components/shared/Decorations'
import { Polaroid } from '@/components/shared/Polaroid'
import { Fab } from '@/components/ui/Fab'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { useDisplayNameFor, useRelationship } from '@/features/relationship/hooks'
import { formatCalendarDate, todayInZone } from '@/lib/dates/format'
import type { Milestone } from './api'
import { useDeleteMilestone, useMilestones } from './hooks'
import { MilestoneEditorSheet } from './MilestoneEditorSheet'
import { buildTimeline } from './timeline'
import { staggerStyle } from '@/lib/stagger'

type EditorState = { isOpen: false } | { isOpen: true; milestone?: Milestone; key: string }

function TimelineMarker({ isHighlighted }: { isHighlighted: boolean }) {
  return isHighlighted ? (
    <span className="absolute -left-[1.4rem] top-1 grid size-6 place-items-center rounded-full bg-blush">
      <Heart className="size-3.5 text-rose-deep" />
    </span>
  ) : (
    <span aria-hidden className="absolute -left-[1.05rem] top-2 size-3 rounded-full border-2 border-rose bg-cream" />
  )
}

interface MilestoneItemProps {
  index: number
  milestone: Milestone
  authorName: string | null
  canEdit: boolean
  canRemove: boolean
  onEdit: () => void
  onRemove: () => void
}

function MilestoneItem({ index, milestone, authorName, canEdit, canRemove, onEdit, onRemove }: MilestoneItemProps) {
  return (
    <li className="relative animate-rise-in pl-2" style={staggerStyle(index)}>
      <TimelineMarker isHighlighted={milestone.is_highlighted} />
      <article className={`rounded-md px-4 py-4 ${milestone.is_highlighted ? 'bg-blush shadow-soft' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-hand text-hand text-rose-deep">{formatCalendarDate(milestone.occurred_on)}</p>
            <h3 className="mt-0.5 text-h3 text-ink">{milestone.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {milestone.status === 'draft' && <DraftBadge />}
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${milestone.title}`}
                className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface"
              >
                <Pencil aria-hidden className="size-4" />
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${milestone.title}`}
                className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface hover:text-error"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </div>
        {milestone.caption && <p className="mt-2 whitespace-pre-line text-body text-ink-soft">{milestone.caption}</p>}
        {authorName && <p className="mt-2 text-small text-ink-soft">added by {authorName}</p>}
        {milestone.photo_path && (
          <div className="mt-4 w-44 sm:w-52">
            <Polaroid path={milestone.photo_path} alt={milestone.title} tiltSeed={milestone.id} />
          </div>
        )}
      </article>
    </li>
  )
}

/** Our Story (PAGE-STRUCTURE §4.5, FR-STORY-01…05). Both members add milestones (CR-02). */
export function StoryPage() {
  const relationship = useRelationship()
  const milestones = useMilestones()
  const isOwner = useRole() === 'owner'
  const { auth } = useAuth()
  const userId = auth.status === 'member' ? auth.userId : null
  const nameFor = useDisplayNameFor()
  const remove = useDeleteMilestone()
  const [editor, setEditor] = useState<EditorState>({ isOpen: false })
  const [removing, setRemoving] = useState<Milestone | null>(null)

  const isLoading = relationship.isPending || milestones.isPending
  const hasError = relationship.isError || milestones.isError
  const timeZone = relationship.data?.timezone ?? 'UTC'

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Our Story</h1>
          <p className="font-hand text-hand text-rose-deep">How our little universe began.</p>
        </div>
        <div className="hidden lg:block">
          <Fab label="Add milestone" onClick={() => setEditor({ isOpen: true, key: crypto.randomUUID() })} />
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : hasError ? (
        <ErrorState onRetry={() => void Promise.all([relationship.refetch(), milestones.refetch()])} />
      ) : (
        <>
          {relationship.data?.intro_story && (
            <section className="rounded-paper bg-surface px-5 py-6 shadow-soft">
              <p className="whitespace-pre-line text-letter text-ink">{relationship.data.intro_story}</p>
            </section>
          )}

          <ol className="relative ml-4 flex flex-col gap-4 border-l-2 border-petal pl-4" aria-label="Timeline">
            {buildTimeline(milestones.data ?? [], relationship.data?.start_at ?? null, timeZone).map((entry, index) =>
              entry.kind === 'anchor' ? (
                <li key="anchor" className="relative animate-rise-in pl-2" style={staggerStyle(index)}>
                  <span aria-hidden className="absolute -left-[1.4rem] top-1 grid size-6 place-items-center rounded-full bg-rose-deep">
                    <Sparkle className="size-3 text-white" />
                  </span>
                  <div className="px-4 py-1">
                    <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">The day it all began</p>
                    <p className="font-hand text-hand-lg text-rose-deep">{formatCalendarDate(entry.date)}</p>
                  </div>
                </li>
              ) : (
                <MilestoneItem
                  key={entry.milestone.id}
                  index={index}
                  milestone={entry.milestone}
                  // "added by" only for the other person's milestones
                  authorName={entry.milestone.created_by && entry.milestone.created_by !== userId ? nameFor(entry.milestone.created_by) : null}
                  canEdit={entry.milestone.created_by === userId}
                  canRemove={isOwner && entry.milestone.created_by !== userId}
                  onEdit={() => setEditor({ isOpen: true, milestone: entry.milestone, key: entry.milestone.id + entry.milestone.updated_at })}
                  onRemove={() => setRemoving(entry.milestone)}
                />
              ),
            )}
            <li className="relative pl-6 pt-2">
              <span aria-hidden className="absolute -left-[0.6rem] top-3">
                <Sparkle className="size-3 text-rose" />
              </span>
              <p className="font-hand text-hand text-ink-soft">
                {milestones.data?.length ? 'to be continued…' : 'Our story is just beginning…'}
              </p>
            </li>
          </ol>
        </>
      )}

      <div className="lg:hidden">
        <Fab label="Add milestone" onClick={() => setEditor({ isOpen: true, key: crypto.randomUUID() })} />
      </div>

      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this milestone?"
        message={`"${removing?.title ?? ''}" will be removed from our story for both of you. This can't be undone.`}
        confirmLabel="Remove"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => {
          if (removing) void remove.mutateAsync(removing).finally(() => setRemoving(null))
        }}
        onCancel={() => setRemoving(null)}
      />

      {editor.isOpen && (
        <MilestoneEditorSheet
          key={editor.key}
          isOpen
          milestone={editor.milestone}
          defaultDate={todayInZone(timeZone)}
          onClose={() => setEditor({ isOpen: false })}
        />
      )}
    </div>
  )
}
