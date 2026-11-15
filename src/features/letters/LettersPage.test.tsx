import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Letter } from './api'
import { LettersPage } from './LettersPage'

const OWNER = 'owner-id'
const PARTNER = 'partner-id'
const viewer = { role: 'partner' as 'owner' | 'partner', userId: PARTNER }
const letters: { current: Letter[] } = { current: [] }
const NOW = new Date('2025-05-01T12:00:00Z')

vi.mock('@/features/auth/useAuth', () => ({
  useRole: () => viewer.role,
  useAuth: () => ({ auth: { status: 'member', userId: viewer.userId, role: viewer.role } }),
}))
vi.mock('@/features/relationship/hooks', () => ({ useNames: () => ({ owner: 'Owner Name', partner: 'Partner Name' }) }))
vi.mock('@/lib/time/useNow', () => ({ useNow: () => NOW }))
vi.mock('./hooks', () => ({
  useLetters: () => ({ isPending: false, isError: false, data: letters.current }),
  useOpenLetter: () => ({ mutateAsync: () => Promise.resolve({}), isPending: false }),
  useDeleteLetter: () => ({ mutateAsync: () => Promise.resolve(), isPending: false }),
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
    created_by: OWNER,
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

const section = (name: string) => screen.getByRole('region', { name })

describe('LettersPage (partner viewing)', () => {
  beforeEach(() => {
    viewer.role = 'partner'
    viewer.userId = PARTNER
    letters.current = []
  })

  it('splits letters into "For you" and "Written by you"', () => {
    letters.current = [letter('From him'), letter('From her', { created_by: PARTNER })]
    renderPage()
    expect(within(section('For you')).getByRole('button', { name: /^From him,/ })).toBeInTheDocument()
    expect(within(section('Written by you')).getByRole('button', { name: /^From her,/ })).toBeInTheDocument()
  })

  it('lets her write letters and edit only her own', () => {
    letters.current = [letter('From him'), letter('From her', { created_by: PARTNER })]
    renderPage()
    expect(screen.getAllByRole('button', { name: 'New letter' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Edit From her' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit From him' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
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

  it('opens her own letters straight into the reading view (author preview)', async () => {
    letters.current = [letter('Mine, locked', { created_by: PARTNER, unlock_type: 'scheduled', unlock_at: '2025-06-01T00:00:00Z' })]
    renderPage()
    expect(screen.getByText('opens in 30 days')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Mine, locked,/ }))
    expect(screen.getByText('reading view')).toBeInTheDocument()
  })

  it('shows who has opened her letters', () => {
    letters.current = [letter('Read by him', { created_by: PARTNER, first_opened_at: '2025-04-01T00:00:00Z' })]
    renderPage()
    expect(screen.getByText('opened by Owner Name')).toBeInTheDocument()
  })
})

describe('LettersPage (owner viewing)', () => {
  beforeEach(() => {
    viewer.role = 'owner'
    viewer.userId = OWNER
    letters.current = []
  })

  it('can remove her letters but not edit them', () => {
    letters.current = [letter('From her', { created_by: PARTNER })]
    renderPage()
    expect(screen.getByRole('button', { name: 'Remove From her' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit From her' })).not.toBeInTheDocument()
  })

  it('asks for confirmation before removing', async () => {
    letters.current = [letter('From her', { created_by: PARTNER })]
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Remove From her' }))
    expect(screen.getByText(/will be deleted for both of you/)).toBeInTheDocument()
  })

  it('edits his own letters and sees drafts and read status', () => {
    letters.current = [letter('Secret draft', { status: 'draft' }), letter('Read one', { first_opened_at: '2025-04-01T00:00:00Z' })]
    renderPage()
    expect(screen.getByRole('button', { name: 'Edit Secret draft' })).toBeInTheDocument()
    expect(screen.getByText('draft · anytime')).toBeInTheDocument()
    expect(screen.getByText('opened by Partner Name')).toBeInTheDocument()
  })
})
