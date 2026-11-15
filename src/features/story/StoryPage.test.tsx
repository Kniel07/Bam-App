import { render, screen } from '@testing-library/react'
import type { Milestone } from './api'
import { StoryPage } from './StoryPage'

const OWNER = 'owner-id'
const PARTNER = 'partner-id'
const role = { current: 'owner' as 'owner' | 'partner' }
const userIdFor = () => (role.current === 'owner' ? OWNER : PARTNER)
const milestones: { current: Milestone[] } = { current: [] }

vi.mock('@/features/auth/useAuth', () => ({
  useRole: () => role.current,
  useAuth: () => ({ auth: { status: 'member', userId: userIdFor(), role: role.current } }),
}))
vi.mock('@/lib/media/storage', () => ({ useSignedUrl: () => ({ data: undefined, isError: false }) }))
vi.mock('@/features/relationship/hooks', () => ({
  useDisplayNameFor: () => (id: string) => (id === OWNER ? 'Owner Name' : 'Partner Name'),
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
    created_by: OWNER,
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

  it('lets the partner add milestones and edit only her own (CR-02)', () => {
    role.current = 'partner'
    milestones.current = [milestone({ title: 'His milestone' }), milestone({ title: 'Her milestone', created_by: PARTNER })]
    render(<StoryPage />)
    expect(screen.getAllByRole('button', { name: 'Add milestone' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Edit Her milestone' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit His milestone' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(screen.getByText('added by Owner Name')).toBeInTheDocument()
  })

  it('lets the owner remove (not edit) her milestones', () => {
    milestones.current = [milestone({ title: 'Her milestone', created_by: PARTNER })]
    render(<StoryPage />)
    expect(screen.getByRole('button', { name: 'Remove Her milestone' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Her milestone' })).not.toBeInTheDocument()
    expect(screen.getByText('added by Partner Name')).toBeInTheDocument()
  })
})
