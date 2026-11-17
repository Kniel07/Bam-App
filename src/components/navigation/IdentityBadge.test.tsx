import { render, screen } from '@testing-library/react'
import { IdentityAvatar, IdentityCard } from './IdentityBadge'

const state = { role: 'owner' as 'owner' | 'partner' | null, name: '' }

vi.mock('@/features/auth/useAuth', () => ({ useRole: () => state.role }))
vi.mock('@/features/relationship/hooks', () => ({
  useCurrentMember: () => (state.role ? { userId: 'u', role: state.role, displayName: state.name, welcomedAt: null } : undefined),
}))

describe('identity badge', () => {
  it('shows the owner with name, initial, role label and owner colour', () => {
    state.role = 'owner'
    state.name = 'Alex'
    const { container } = render(<IdentityCard />)
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(container.querySelector('[data-role="owner"]')).toHaveTextContent('A')
  })

  it('shows the partner differently from the owner', () => {
    state.role = 'partner'
    state.name = 'Sam'
    const { container } = render(<IdentityCard />)
    expect(screen.getByText('Partner')).toBeInTheDocument()
    expect(container.querySelector('[data-role="partner"]')).toHaveTextContent('S')
    expect(container.querySelector('[data-role="owner"]')).toBeNull()
  })

  it('falls back to the role when no display name is set, so accounts never look alike', () => {
    state.role = 'partner'
    state.name = ''
    render(<IdentityCard />)
    expect(screen.getAllByText('Partner').length).toBeGreaterThan(0)
  })

  it('renders nothing when signed out', () => {
    state.role = null
    const { container } = render(<IdentityAvatar />)
    expect(container).toBeEmptyDOMElement()
  })
})
