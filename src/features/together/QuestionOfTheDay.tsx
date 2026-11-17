import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { useNames } from '@/features/relationship/hooks'
import { formatCalendarDate } from '@/lib/dates/format'
import { supabase } from '@/lib/supabase/client'
import { copy } from '@/lib/copy'
import { addQuestion, fetchAnswers, fetchPastQuestions, fetchTodayQuestion, saveAnswer } from './questionApi'

export const questionKeys = {
  today: ['question', 'today'] as const,
  answers: (day: string) => ['question', 'answers', day] as const,
  past: (day: string) => ['question', 'past', day] as const,
}

export function useTodayQuestion() {
  return useQuery({ queryKey: questionKeys.today, queryFn: fetchTodayQuestion, refetchInterval: 120_000 })
}

/** Question of the day (CR-06 #4): answers stay hidden until you've both answered. */
export function QuestionOfTheDay() {
  const { auth } = useAuth()
  const role = useRole()
  const names = useNames()
  const queryClient = useQueryClient()
  const myUserId = auth.status === 'member' ? auth.userId : null
  const otherName = role === 'owner' ? names.partner : names.owner
  const today = useTodayQuestion()
  const day = today.data?.day ?? ''
  const answers = useQuery({ queryKey: questionKeys.answers(day), queryFn: () => fetchAnswers(day), enabled: Boolean(day) })
  const past = useQuery({ queryKey: questionKeys.past(day), queryFn: () => fetchPastQuestions(day), enabled: Boolean(day) })
  const [draft, setDraft] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mine = answers.data?.find((answer) => answer.user_id === myUserId)
  const theirs = answers.data?.find((answer) => answer.user_id !== myUserId)

  // Live: refresh when either answer arrives (RLS still hides theirs until you answer).
  useEffect(() => {
    const channel = supabase
      .channel('answers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_answers' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['question'] })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  const save = useMutation({
    mutationFn: () => saveAnswer(day, draft, isEditing ? mine?.id : undefined),
    onSuccess: () => {
      setDraft('')
      setIsEditing(false)
      void queryClient.invalidateQueries({ queryKey: ['question'] })
    },
    onError: () => setError(copy.errors.generic),
  })

  if (today.isPending) return <Skeleton className="h-48 rounded-lg" />
  if (today.isError) return <ErrorState onRetry={() => void today.refetch()} />
  if (!today.data) return null

  const showForm = !mine || isEditing

  return (
    <section aria-labelledby="question-heading" className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">Question of the day</p>
          <h2 id="question-heading" className="mt-1 text-h2">
            {today.data.text}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingQuestion(true)}
          aria-label="Add your own question"
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-blush"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            save.mutate()
          }}
          className="flex flex-col gap-3"
        >
          <TextArea
            label={isEditing ? 'Edit your answer' : 'Your answer'}
            rows={3}
            maxLength={500}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            hint={today.data.theyAnswered && !mine ? `${otherName} has answered. Answer to see theirs ✨` : 'Hidden from them until you’ve both answered.'}
          />
          <Button type="submit" isLoading={save.isPending} disabled={!draft.trim()}>
            {isEditing ? 'Save answer' : 'Answer'}
          </Button>
        </form>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-lavender-mist px-4 py-3">
            <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">You</p>
            <p className="mt-1 whitespace-pre-line text-body text-ink">{mine?.answer}</p>
            <button
              type="button"
              onClick={() => {
                setDraft(mine?.answer ?? '')
                setIsEditing(true)
              }}
              className="mt-1 min-h-11 text-small font-semibold text-lavender-deep"
            >
              Edit
            </button>
          </div>
          <div className="rounded-md bg-blush px-4 py-3">
            <p className="text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">{otherName}</p>
            {theirs ? (
              <p className="mt-1 animate-rise-in whitespace-pre-line text-body text-ink">{theirs.answer}</p>
            ) : (
              <p className="mt-1 flex items-center gap-2 text-small text-ink-soft">
                <Lock aria-hidden className="size-4" /> Waiting for {otherName}… their answer appears once they’ve answered.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-small text-error">
          {error}
        </p>
      )}

      {past.data && past.data.length > 0 && (
        <details className="text-small">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-rose-deep">Earlier questions</summary>
          <ul className="mt-2 flex flex-col gap-3">
            {past.data.map((item) => (
              <li key={item.day} className="rounded-md bg-cream px-4 py-3">
                <p className="text-ink-soft">{formatCalendarDate(item.day, 'medium')}</p>
                <p className="font-semibold text-ink">{item.text}</p>
                {item.answers.map((answer) => (
                  <p key={answer.id} className="mt-1 text-ink">
                    <span className="font-semibold">{answer.user_id === myUserId ? 'You' : otherName}:</span> {answer.answer}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </details>
      )}

      {isAddingQuestion && <AddQuestionSheet onClose={() => setIsAddingQuestion(false)} />}
    </section>
  )
}

function AddQuestionSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const add = useMutation({ mutationFn: () => addQuestion(text), onSuccess: () => setDone(true) })
  return (
    <Sheet isOpen onClose={onClose} title="Add a question">
      {done ? (
        <div className="flex flex-col gap-4">
          <p className="text-body">Added! It will come up on a future day 💬</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            add.mutate()
          }}
          className="flex flex-col gap-4"
        >
          <TextField label="Your question" value={text} maxLength={200} onChange={(event) => setText(event.target.value)} hint="Asked to both of you on a future day." required />
          {add.isError && (
            <p role="alert" className="text-small text-error">
              {copy.errors.generic}
            </p>
          )}
          <Button type="submit" isLoading={add.isPending} disabled={text.trim().length < 5}>
            Add question
          </Button>
        </form>
      )}
    </Sheet>
  )
}
