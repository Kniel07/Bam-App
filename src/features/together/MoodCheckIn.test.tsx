import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MoodKind } from '@/lib/supabase/database.types'
import type { Mood } from './api'
import { MoodCheckIn } from './MoodCheckIn'

const NOW = new Date('2025-05-10T12:00:00Z')
const shared: { mood: MoodKind; note: string }[] = []
const moods: { current: Mood[] } = { current: [] }

vi.mock('@/features/auth/useAuth', () => ({
  useRole: () => 'partner',
  useAuth: () => ({ auth: { status: 'member', userId: 'me', role: 'partner' } }),
}))
vi.mock('@/features/relationship/hooks', () => ({ useNames: () => ({ owner: 'Owner Name', partner: 'Partner Name' }) }))
vi.mock('@/lib/time/useNow', () => ({ useNow: () => NOW }))
vi.mock('./hooks', () => ({
  useRecentMoods: () => ({ data: moods.current }),
  useShareMood: () => ({
    isPending: false,
    mutateAsync: (input: { mood: MoodKind; note: string }) => {
      shared.push(input)
      return Promise.resolve()
    },
  }),
}))

describe('MoodCheckIn', () => {
  beforeEach(() => {
    shared.length = 0
    moods.current = []
  })

  it('shows the other person’s latest mood and note', () => {
    moods.current = [{ id: '1', user_id: 'them', mood: 'sleepy', note: 'long day', created_at: '2025-05-10T11:30:00Z' }]
    render(<MoodCheckIn />)
    expect(screen.getByText('Owner Name')).toBeInTheDocument()
    expect(screen.getByText('😴 sleepy')).toBeInTheDocument()
    expect(screen.getByText('“long day”')).toBeInTheDocument()
  })

  it('shares a mood with an optional note', async () => {
    render(<MoodCheckIn />)
    await userEvent.click(screen.getByRole('radio', { name: 'loving' }))
    await userEvent.type(screen.getByLabelText('A few words (optional)'), 'thinking of you')
    await userEvent.click(screen.getByRole('button', { name: /Share/ }))
    expect(shared).toEqual([{ mood: 'loving', note: 'thinking of you' }])
    expect(await screen.findByText('Shared with Owner Name 🌤️')).toBeInTheDocument()
  })
})
