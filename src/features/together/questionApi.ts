import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import { ApiError } from '@/features/relationship/api'
import { pokeNotifier } from '@/features/nudges/api'

export type Answer = Tables<'question_answers'>

export interface TodayQuestion {
  day: string
  questionId: string
  text: string
  iAnswered: boolean
  theyAnswered: boolean
}

export interface PastQuestion {
  day: string
  text: string
  answers: Answer[]
}

/** Today's shared question, assigned by the database (same on both phones). */
export async function fetchTodayQuestion(): Promise<TodayQuestion | null> {
  const { data, error } = await supabase.rpc('today_question')
  if (error) throw new ApiError('Could not load today’s question', error)
  const row = data[0]
  if (!row) return null
  return { day: row.day, questionId: row.question_id, text: row.text, iAnswered: row.i_answered, theyAnswered: row.they_answered }
}

/** Answers for a day. RLS returns the other's answer only once you've answered. */
export async function fetchAnswers(day: string): Promise<Answer[]> {
  const { data, error } = await supabase.from('question_answers').select('*').eq('day', day)
  if (error) throw new ApiError('Could not load answers', error)
  return data
}

export async function saveAnswer(day: string, answer: string, existingId?: string): Promise<void> {
  const text = answer.trim()
  const { error } = existingId
    ? await supabase.from('question_answers').update({ answer: text }).eq('id', existingId)
    : await supabase.from('question_answers').insert({ day, answer: text })
  if (error) throw new ApiError('Could not save your answer', error)
  if (!existingId) pokeNotifier()
}

/** Earlier days where answers are visible to you (i.e. you answered too). */
export async function fetchPastQuestions(beforeDay: string): Promise<PastQuestion[]> {
  const [days, answers, bank] = await Promise.all([
    supabase.from('daily_questions').select('*').lt('day', beforeDay).order('day', { ascending: false }).limit(14),
    supabase.from('question_answers').select('*').lt('day', beforeDay).order('day', { ascending: false }).limit(60),
    supabase.from('question_bank').select('id, text'),
  ])
  if (days.error || answers.error || bank.error) throw new ApiError('Could not load earlier questions', days.error ?? answers.error ?? bank.error)
  return days.data
    .map((day) => ({
      day: day.day,
      text: bank.data.find((question) => question.id === day.question_id)?.text ?? '',
      answers: answers.data.filter((answer) => answer.day === day.day),
    }))
    .filter((past) => past.answers.length === 2)
}

export async function addQuestion(text: string): Promise<void> {
  const { error } = await supabase.from('question_bank').insert({ text: text.trim() })
  if (error) throw new ApiError('Could not add the question', error)
}
