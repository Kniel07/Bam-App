import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NudgeKind } from '@/lib/supabase/database.types'
import { NudgeTooSoonError, type Nudge } from './api'
import { NudgePad } from './NudgePad'

const NOW = new Date('2025-05-10T12:00:00Z')
const sent: NudgeKind[] = []
let respond: () => Promise<void> = () => Promise.resolve()
const nudges: { current: Nudge[] } = { current: [] }

vi.mock('@/features/auth/useAuth', () => ({
  useRole: () => 'owner',
  useAuth: () => ({ auth: { status: 'member', userId: 'me', role: 'owner' } }),
}))
vi.mock('@/features/relationship/hooks', () => ({ useNames: () => ({ owner: 'Owner Name', partner: 'Partner Name' }) }))
vi.mock('@/lib/time/useNow', () => ({ useNow: () => NOW }))
vi.mock('./hooks', () => ({
  useRecentNudges: () => ({ data: nudges.current }),
  useSendNudge: () => ({
    isPending: false,
    mutateAsync: (kind: NudgeKind) => {
      sent.push(kind)
      return respond()
    },
  }),
}))

describe('NudgePad', () => {
  beforeEach(() => {
    sent.length = 0
    respond = () => Promise.resolve()
    nudges.current = []
  })

  it('sends "I miss you" from the big heart and confirms it', async () => {
    render(<NudgePad />)
    await userEvent.click(screen.getByRole('button', { name: 'Send “I miss you” to Partner Name' }))
    expect(sent).toEqual(['miss_you'])
    expect(await screen.findByText('Sent to Partner Name 💗')).toBeInTheDocument()
  })

  it('sends the smaller nudges', async () => {
    render(<NudgePad />)
    await userEvent.click(screen.getByRole('button', { name: /Good night/ }))
    expect(sent).toEqual(['good_night'])
  })

  it('treats a double tap gently instead of as an error', async () => {
    respond = () => Promise.reject(new NudgeTooSoonError())
    render(<NudgePad />)
    await userEvent.click(screen.getByRole('button', { name: /I miss you/ }))
    expect(await screen.findByText(/Sent a moment ago/)).toBeInTheDocument()
  })

  it('shows the latest nudge from the other person and the weekly tally', () => {
    nudges.current = [
      { id: '1', sender_id: 'them', kind: 'miss_you', created_at: '2025-05-10T11:55:00Z' },
      { id: '2', sender_id: 'me', kind: 'hug', created_at: '2025-05-09T10:00:00Z' },
    ]
    render(<NudgePad />)
    expect(screen.getByRole('status')).toHaveTextContent('💗 Partner Name misses you · 5 min ago')
    expect(screen.getByText('This week: you 💗 1 · Partner Name 💗 1')).toBeInTheDocument()
  })
})
