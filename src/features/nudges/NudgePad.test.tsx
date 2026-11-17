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
    mutateAsync: ({ kind, hugSeconds }: { kind: NudgeKind; hugSeconds?: number }) => {
      sent.push(hugSeconds ? (`${kind}:${hugSeconds}` as NudgeKind) : kind)
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

  it('sends a 1-second hug from the keyboard and shows the hold label', async () => {
    render(<NudgePad />)
    const hug = screen.getByRole('button', { name: 'Hold to send a hug' })
    expect(hug).toHaveTextContent('Hold to hug')
    hug.focus()
    await userEvent.keyboard('{Enter}')
    expect(sent).toEqual(['hug:1'])
  })

  it('shows a received hug with its length and a "Feel it" button', () => {
    nudges.current = [{ id: 'h', sender_id: 'them', kind: 'hug', hug_seconds: 5, created_at: '2025-05-10T11:58:00Z' }]
    render(<NudgePad />)
    expect(screen.getByRole('status')).toHaveTextContent('Partner Name sent you a 5-second hug')
    expect(screen.getByRole('button', { name: 'Feel it 🤗' })).toBeInTheDocument()
  })

  it('celebrates the same moment', () => {
    nudges.current = [
      { id: 'a', sender_id: 'them', kind: 'miss_you', hug_seconds: null, created_at: '2025-05-10T11:59:10Z' },
      { id: 'b', sender_id: 'me', kind: 'miss_you', hug_seconds: null, created_at: '2025-05-10T11:59:40Z' },
    ]
    render(<NudgePad />)
    expect(screen.getByText(/You thought of each other at the same time/)).toBeInTheDocument()
  })

  it('treats a double tap gently instead of as an error', async () => {
    respond = () => Promise.reject(new NudgeTooSoonError())
    render(<NudgePad />)
    await userEvent.click(screen.getByRole('button', { name: /I miss you/ }))
    expect(await screen.findByText(/Sent a moment ago/)).toBeInTheDocument()
  })

  it('shows the latest nudge from the other person and the weekly tally', () => {
    nudges.current = [
      { id: '1', sender_id: 'them', kind: 'miss_you', hug_seconds: null, created_at: '2025-05-10T11:55:00Z' },
      { id: '2', sender_id: 'me', kind: 'hug', hug_seconds: null, created_at: '2025-05-09T10:00:00Z' },
    ]
    render(<NudgePad />)
    expect(screen.getByRole('status')).toHaveTextContent('💗 Partner Name misses you · 5 min ago')
    expect(screen.getByText('This week: you 💗 1 · Partner Name 💗 1')).toBeInTheDocument()
  })
})
