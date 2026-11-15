import { render, screen } from '@testing-library/react'
import type { Milestone } from './api'
import { StoryPage } from './StoryPage'

const role = { current: 'owner' as 'owner' | 'partner' }
const milestones: { current: Milestone[] } = { current: [] }

vi.mock('@/features/auth/useAuth', () => ({ useRole: () => role.current }))
vi.mock('@/lib/media/storage', () => ({ useSignedUrl: () => ({ data: undefined, isError: false }) }))
vi.mock('@/features/relationship/hooks', () => ({
  useRelationship: () => ({
    isPending: false,
    isError: false,
    data: { start_at: '2025-03-09T15:35:00Z', timezone: 'Asia/Tokyo', intro_story: 'Intro words.' },
  }),
}))
vi.mock('./hooks', () => ({
  useMilestones: () => ({ isPending: false, isError: false, data: milestones.current }),
  useSaveMilestone: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMilestone: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function milestone(overrides: Partial<Milestone>): Milestone {
  return {
    id: crypto.randomUUID(),
    title: 'A milestone',
    caption: '',
    occurred_on: '2025-04-01',
    photo_path: null,
    is_highlighted: false,
    sort_order: 0,
    status: 'published',
    created_by: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('StoryPage', () => {
  beforeEach(() => {
    role.current = 'owner'
    milestones.current = []
  })

  it('always starts with the anchor marker, so it is never empty', () => {
    render(<StoryPage />)
    expect(screen.getByText('The day it all began')).toBeInTheDocument()
    expect(screen.getByText('Our story is just beginning…')).toBeInTheDocument()
    expect(screen.getByText('Intro words.')).toBeInTheDocument()
  })

  it('lists milestones and switches the end cap to "to be continued"', () => {
    milestones.current = [milestone({ title: 'First date' })]
    render(<StoryPage />)
    expect(screen.getByRole('heading', { name: 'First date' })).toBeInTheDocument()
    expect(screen.getByText('to be continued…')).toBeInTheDocument()
  })

  it('gives the owner edit and add controls, and marks drafts', () => {
    milestones.current = [milestone({ title: 'Secret plan', status: 'draft' })]
    render(<StoryPage />)
    expect(screen.getByRole('button', { name: 'Edit Secret plan' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add milestone' }).length).toBeGreaterThan(0)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('gives the partner no editing controls', () => {
    role.current = 'partner'
    milestones.current = [milestone({ title: 'First date' })]
    render(<StoryPage />)
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add milestone' })).not.toBeInTheDocument()
  })
})
