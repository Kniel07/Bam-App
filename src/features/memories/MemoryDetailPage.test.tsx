import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Memory } from './api'
import { MemoryDetailPage } from './MemoryDetailPage'

const OWNER = 'owner-id'
const PARTNER = 'partner-id'
const viewer = { role: 'partner' as 'owner' | 'partner', userId: PARTNER }
const current: { memory: Memory } = { memory: {} as Memory }
const featuredCalls: { id: string; featured: boolean }[] = []

vi.mock('@/features/auth/useAuth', () => ({
  useRole: () => viewer.role,
  useAuth: () => ({ auth: { status: 'member', userId: viewer.userId, role: viewer.role } }),
}))
vi.mock('@/features/relationship/hooks', () => ({
  useDisplayNameFor: () => (id: string) => (id === OWNER ? 'Owner Name' : 'Partner Name'),
  useRelationship: () => ({ data: { timezone: 'UTC' } }),
}))
vi.mock('@/lib/media/storage', () => ({ useSignedUrl: () => ({ data: undefined, isError: false }) }))
vi.mock('./MemoryEditorSheet', () => ({ MemoryEditorSheet: ({ canDelete }: { canDelete: boolean }) => <p>editor open, canDelete={String(canDelete)}</p> }))
vi.mock('./hooks', () => ({
  useMemory: () => ({ isPending: false, isError: false, data: current.memory }),
  useMemoriesList: () => ({ data: { pages: [[current.memory]] } }),
  useSetFeatured: () => ({
    isPending: false,
    mutate: (input: { id: string; featured: boolean }) => featuredCalls.push(input),
  }),
}))

function memory(overrides: Partial<Memory>): Memory {
  return {
    id: 'm1',
    caption: 'A caption',
    taken_on: '2025-05-01',
    photo_path: 'memories/m1/a.webp',
    status: 'published',
    created_by: OWNER,
    is_featured: false,
    featured_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/memories/m1']}>
      <Routes>
        <Route path="/memories/:memoryId" element={<MemoryDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MemoryDetailPage', () => {
  beforeEach(() => {
    featuredCalls.length = 0
    viewer.role = 'partner'
    viewer.userId = PARTNER
  })

  it('lets her feature HIS memory on Home without edit rights (CR-03)', async () => {
    current.memory = memory({})
    renderPage()
    expect(screen.getByText(/added by Owner Name/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Feature on Home' }))
    expect(featuredCalls).toEqual([{ id: 'm1', featured: true }])
  })

  it('shows "Featured on Home" and unfeatures', async () => {
    current.memory = memory({ is_featured: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Featured on Home' }))
    expect(featuredCalls).toEqual([{ id: 'm1', featured: false }])
  })

  it('lets her edit and delete her own memory', async () => {
    current.memory = memory({ created_by: PARTNER })
    renderPage()
    expect(screen.getByText(/added by you/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('editor open, canDelete=true')).toBeInTheDocument()
  })

  it('lets the owner remove (not edit) her memory', () => {
    viewer.role = 'owner'
    viewer.userId = OWNER
    current.memory = memory({ created_by: PARTNER })
    renderPage()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })
})
