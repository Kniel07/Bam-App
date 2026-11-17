import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart as HeartIcon, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Sheet } from '@/components/ui/Sheet'
import { TextArea } from '@/components/ui/TextArea'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { useNames } from '@/features/relationship/hooks'
import { supabase } from '@/lib/supabase/client'
import { copy } from '@/lib/copy'
import {
  deleteReason,
  fetchFavoriteIds,
  fetchReasons,
  formatReasonNumber,
  pickRandomReason,
  saveReason,
  setFavorite,
  type Reason,
} from './reasonsApi'

const reasonKeys = { all: ['reasons'] as const, favorites: ['reasons', 'favorites'] as const }

function ReasonEditor({ reason, recipientName, onClose }: { reason?: Reason; recipientName: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState(reason?.body ?? '')
  const save = useMutation({
    mutationFn: () => saveReason(body, reason?.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reasonKeys.all })
      onClose()
    },
  })
  return (
    <Sheet isOpen onClose={onClose} title={reason ? `Edit ${formatReasonNumber(reason.number)}` : `A reason for ${recipientName}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
        className="flex flex-col gap-4"
      >
        <TextArea label="Because…" rows={4} maxLength={280} value={body} onChange={(event) => setBody(event.target.value)} required />
        {save.isError && (
          <p role="alert" className="text-small text-error">
            {copy.errors.generic}
          </p>
        )}
        <Button type="submit" isLoading={save.isPending} disabled={!body.trim()}>
          {reason ? 'Save' : 'Add to their jar'}
        </Button>
      </form>
    </Sheet>
  )
}

/** Reasons jar (CR-06 #7): pull a random reason the other person wrote for you. */
export function ReasonsJar() {
  const { auth } = useAuth()
  const role = useRole()
  const names = useNames()
  const queryClient = useQueryClient()
  const myUserId = auth.status === 'member' ? auth.userId : null
  const otherName = role === 'owner' ? names.partner : names.owner
  const reasons = useQuery({ queryKey: reasonKeys.all, queryFn: fetchReasons })
  const favorites = useQuery({ queryKey: reasonKeys.favorites, queryFn: fetchFavoriteIds })
  const [shown, setShown] = useState<Reason | null>(null)
  const [flipKey, setFlipKey] = useState(0)
  const [editor, setEditor] = useState<{ reason?: Reason; key: string } | null>(null)
  const [removing, setRemoving] = useState<Reason | null>(null)
  const [isListOpen, setIsListOpen] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel('reasons-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_reasons' }, () => {
        void queryClient.invalidateQueries({ queryKey: reasonKeys.all })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  const forMe = (reasons.data ?? []).filter((reason) => reason.created_by !== myUserId)
  const byMe = (reasons.data ?? []).filter((reason) => reason.created_by === myUserId)
  const favoriteIds = new Set(favorites.data ?? [])

  const toggleFavorite = useMutation({
    mutationFn: (reason: Reason) => setFavorite(reason.id, !favoriteIds.has(reason.id)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reasonKeys.favorites }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteReason(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reasonKeys.all }),
  })

  function drawReason() {
    const next = pickRandomReason(forMe, shown?.id ?? null)
    setShown(next)
    setFlipKey((value) => value + 1)
    navigator.vibrate?.(12)
  }

  return (
    <section aria-labelledby="jar-heading" className="flex flex-col items-center gap-4 rounded-lg bg-surface p-5 shadow-soft">
      <h2 id="jar-heading" className="self-start text-h2">
        Reasons jar
      </h2>

      <button
        type="button"
        onClick={drawReason}
        disabled={forMe.length === 0}
        aria-label={forMe.length ? `Take a reason from your jar (${forMe.length} inside)` : 'Your jar is empty for now'}
        className="relative grid h-36 w-28 place-items-end rounded-b-[2.5rem] rounded-t-2xl border-4 border-petal bg-cream pb-3 shadow-soft transition-transform active:scale-95 disabled:opacity-70"
      >
        <span aria-hidden className="absolute -top-3 left-1/2 h-4 w-20 -translate-x-1/2 rounded-md bg-rose-deep" />
        <span aria-hidden className="mx-auto flex flex-wrap justify-center gap-0.5 px-2 text-small">
          {Array.from({ length: Math.min(forMe.length, 12) }, (_, index) => (
            <span key={index}>{index % 3 === 0 ? '💗' : index % 3 === 1 ? '📜' : '💌'}</span>
          ))}
        </span>
      </button>
      <p className="text-small text-ink-soft">
        {forMe.length
          ? `${forMe.length} reason${forMe.length === 1 ? '' : 's'} from ${otherName}. Tap the jar.`
          : `When ${otherName} adds reasons, they'll land in your jar.`}
      </p>

      {shown && (
        <article key={flipKey} className="w-full animate-flip-in rounded-paper bg-blush px-5 py-5 text-center shadow-lift">
          <p className="text-micro font-bold uppercase tracking-[0.06em] text-rose-deep">{formatReasonNumber(shown.number)}</p>
          <p className="mt-2 font-hand text-hand-lg text-ink">Because {shown.body}</p>
          <p className="mt-2 text-small text-ink-soft">from {otherName}</p>
          <button
            type="button"
            onClick={() => toggleFavorite.mutate(shown)}
            aria-pressed={favoriteIds.has(shown.id)}
            aria-label={favoriteIds.has(shown.id) ? 'Remove from favorites' : 'Add to favorites'}
            className="mt-2 inline-grid size-11 place-items-center rounded-full text-rose-deep hover:bg-surface"
          >
            <HeartIcon aria-hidden className={`size-5 ${favoriteIds.has(shown.id) ? 'fill-current' : ''}`} />
          </button>
        </article>
      )}

      <div className="flex w-full flex-wrap justify-center gap-2">
        <Button size="sm" onClick={() => setEditor({ key: crypto.randomUUID() })}>
          Write a reason for {otherName}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setIsListOpen(true)} disabled={!reasons.data?.length}>
          See all
        </Button>
      </div>

      {isListOpen && (
        <Sheet isOpen onClose={() => setIsListOpen(false)} title="All reasons">
          <div className="flex flex-col gap-5">
            <section>
              <h3 className="mb-2 text-h3">For you, from {otherName}</h3>
              <ul className="flex flex-col gap-2">
                {forMe.map((reason) => (
                  <li key={reason.id} className="flex items-start gap-2 rounded-md bg-blush px-3 py-2 text-small">
                    <span className="font-bold text-rose-deep">#{String(reason.number).padStart(3, '0')}</span>
                    <span className="flex-1 text-ink">Because {reason.body}</span>
                    {favoriteIds.has(reason.id) && <HeartIcon aria-label="favorite" className="size-4 shrink-0 fill-current text-rose-deep" />}
                    {role === 'owner' && (
                      <button type="button" onClick={() => setRemoving(reason)} aria-label={`Remove reason ${reason.number}`} className="grid size-9 place-items-center text-ink-soft hover:text-error">
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
                {forMe.length === 0 && <li className="text-small text-ink-soft">None yet.</li>}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-h3">Written by you</h3>
              <ul className="flex flex-col gap-2">
                {byMe.map((reason) => (
                  <li key={reason.id} className="flex items-start gap-2 rounded-md bg-lavender-mist px-3 py-2 text-small">
                    <span className="font-bold text-lavender-deep">#{String(reason.number).padStart(3, '0')}</span>
                    <span className="flex-1 text-ink">Because {reason.body}</span>
                    <button type="button" onClick={() => setEditor({ reason, key: reason.id + reason.updated_at })} aria-label={`Edit reason ${reason.number}`} className="grid size-9 place-items-center text-ink-soft">
                      <Pencil aria-hidden className="size-4" />
                    </button>
                    <button type="button" onClick={() => setRemoving(reason)} aria-label={`Delete reason ${reason.number}`} className="grid size-9 place-items-center text-ink-soft hover:text-error">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
                {byMe.length === 0 && <li className="text-small text-ink-soft">You haven’t written any yet.</li>}
              </ul>
            </section>
          </div>
        </Sheet>
      )}

      {editor && <ReasonEditor key={editor.key} reason={editor.reason} recipientName={otherName} onClose={() => setEditor(null)} />}
      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this reason?"
        message="It will be removed for both of you."
        confirmLabel="Remove"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => {
          if (removing) void remove.mutateAsync(removing.id).finally(() => setRemoving(null))
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  )
}
