import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Letter } from './api'
import { LettersPage } from './LettersPage'

const role = { current: 'partner' as 'owner' | 'partner' }
const letters: { current: Letter[] } = { current: [] }
const NOW = new Date('2025-05-01T12:00:00Z')

vi.mock('@/features/auth/useAuth', () => ({ useRole: () => role.current }))
vi.mock('@/lib/time/useNow', () => ({ useNow: () => NOW }))
vi.mock('./hooks', () => ({
  useLetters: () => ({ isPending: false, isError: false, data: letters.current }),
  useOpenLetter: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('./LetterEditorSheet', () => ({ LetterEditorSheet: () => <p>editor open</p> }))

function letter(id: string, overrides: Partial<Letter> = {}): Letter {
  return {
    id,
    label: id,
    unlock_type: 'on_demand',
    unlock_at: null,
    status: 'published',
    sort_order: 0,
    first_opened_at: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/letters']}>
      <Routes>
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/letters/:letterId" element={<p>reading view</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LettersPage', () => {
  beforeEach(() => {
    role.current = 'partner'
    letters.current = []
  })

  it('tells her when a scheduled letter will open, without presenting it', async () => {
    letters.current = [letter('Open on our monthsary', { unlock_type: 'scheduled', unlock_at: '2025-05-04T12:00:00Z' })]
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Open on our monthsary, locked/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Not yet… opens in 3 days')
    expect(screen.queryByText('Tap the seal to open')).not.toBeInTheDocument()
  })

  it('presents a sealed letter for the two-tap opening', async () => {
    letters.current = [letter('Open when you miss me')]
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Open when you miss me, sealed/ }))
    expect(screen.getByText('Tap the seal to open')).toBeInTheDocument()
  })

  it('goes straight to the reading view for an opened letter', async () => {
    letters.current = [letter('Read before', { first_opened_at: '2025-04-01T00:00:00Z' })]
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Read before, opened/ }))
    expect(screen.getByText('reading view')).toBeInTheDocument()
  })

  it('shows the partner no edit controls and a gentle empty state', () => {
    renderPage()
    expect(screen.getByText('Your letters are on their way')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New letter' })).not.toBeInTheDocument()
  })

  it('gives the owner edit controls, drafts, and the read status', () => {
    role.current = 'owner'
    letters.current = [letter('Secret draft', { status: 'draft' }), letter('Read one', { first_opened_at: '2025-04-01T00:00:00Z' })]
    renderPage()
    expect(screen.getByRole('button', { name: 'Edit Secret draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Secret draft, draft/ })).toBeInTheDocument()
    expect(screen.getByText('opened by her')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'New letter' }).length).toBeGreaterThan(0)
  })
})
