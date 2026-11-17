import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Answer, TodayQuestion } from './questionApi'
import { QuestionOfTheDay } from './QuestionOfTheDay'

const state: { today: TodayQuestion; answers: Answer[]; saved: string[] } = {
  today: { day: '2025-05-10', questionId: 'q', text: 'What made you smile today?', iAnswered: false, theyAnswered: true },
  answers: [],
  saved: [],
}

vi.mock('@/features/auth/useAuth', () => ({
  useRole: () => 'owner',
  useAuth: () => ({ auth: { status: 'member', userId: 'me', role: 'owner' } }),
}))
vi.mock('@/features/relationship/hooks', () => ({ useNames: () => ({ owner: 'Owner Name', partner: 'Partner Name' }) }))
vi.mock('@/lib/supabase/client', () => ({
  supabase: { channel: () => ({ on: function on() { return this }, subscribe: () => ({}) }), removeChannel: () => Promise.resolve() },
}))
vi.mock('./questionApi', () => ({
  fetchTodayQuestion: () => Promise.resolve(state.today),
  fetchAnswers: () => Promise.resolve(state.answers),
  fetchPastQuestions: () => Promise.resolve([]),
  saveAnswer: (_day: string, text: string) => {
    state.saved.push(text)
    return Promise.resolve()
  },
  addQuestion: () => Promise.resolve(),
}))

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <QuestionOfTheDay />
    </QueryClientProvider>,
  )
}

describe('QuestionOfTheDay', () => {
  beforeEach(() => {
    state.answers = []
    state.saved = []
    state.today = { ...state.today, iAnswered: false, theyAnswered: true }
  })

  it('invites an answer and says theirs is waiting, without showing it', async () => {
    renderCard()
    expect(await screen.findByRole('heading', { name: 'What made you smile today?' })).toBeInTheDocument()
    expect(screen.getByText(/Partner Name has answered\. Answer to see theirs/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Your answer'), 'your voice note')
    await userEvent.click(screen.getByRole('button', { name: 'Answer' }))
    expect(state.saved).toEqual(['your voice note'])
  })

  it('shows both answers once both have answered', async () => {
    state.today = { ...state.today, iAnswered: true }
    state.answers = [
      { id: '1', day: '2025-05-10', user_id: 'me', answer: 'mine', created_at: '', updated_at: '' },
      { id: '2', day: '2025-05-10', user_id: 'them', answer: 'theirs', created_at: '', updated_at: '' },
    ]
    renderCard()
    expect(await screen.findByText('theirs')).toBeInTheDocument()
    expect(screen.getByText('mine')).toBeInTheDocument()
  })

  it('shows a waiting state when only I have answered', async () => {
    state.today = { ...state.today, iAnswered: true, theyAnswered: false }
    state.answers = [{ id: '1', day: '2025-05-10', user_id: 'me', answer: 'mine', created_at: '', updated_at: '' }]
    renderCard()
    expect(await screen.findByText(/Waiting for Partner Name/)).toBeInTheDocument()
  })
})
