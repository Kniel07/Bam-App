import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { copy } from '@/lib/copy'
import { AuthContext, type AuthState } from './AuthProvider'
import { RequireMember, RequireOwner } from './guards'

function renderWith(auth: AuthState, path = '/') {
  return render(
    <AuthContext.Provider value={{ auth, signOut: vi.fn(), retry: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<RequireMember />}>
            <Route path="/" element={<p>private home</p>} />
            <Route element={<RequireOwner />}>
              <Route path="/settings" element={<p>owner settings</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('route guards', () => {
  it('shows the locked screen when signed out', () => {
    renderWith({ status: 'signedOut' })
    expect(screen.getByText(copy.locked.title)).toBeInTheDocument()
    expect(screen.queryByText('private home')).not.toBeInTheDocument()
  })

  it('offers the owner a way to sign in from the locked screen (installed app has no address bar)', () => {
    renderWith({ status: 'signedOut' })
    expect(screen.getByRole('link', { name: copy.locked.ownerLink })).toHaveAttribute('href', '/owner')
  })

  it('shows the locked screen to a signed-in non-member', () => {
    renderWith({ status: 'notMember', userId: 'x' })
    expect(screen.getByText(copy.locked.title)).toBeInTheDocument()
  })

  it('lets members in', () => {
    renderWith({ status: 'member', userId: 'p', role: 'partner' })
    expect(screen.getByText('private home')).toBeInTheDocument()
  })

  it('keeps the partner out of owner routes', () => {
    renderWith({ status: 'member', userId: 'p', role: 'partner' }, '/settings')
    expect(screen.queryByText('owner settings')).not.toBeInTheDocument()
    expect(screen.getByText('private home')).toBeInTheDocument()
  })

  it('lets the owner into owner routes', () => {
    renderWith({ status: 'member', userId: 'o', role: 'owner' }, '/settings')
    expect(screen.getByText('owner settings')).toBeInTheDocument()
  })

  it('offers a retry when membership could not be checked', () => {
    renderWith({ status: 'error', userId: 'x' })
    expect(screen.getByRole('button', { name: copy.errors.retry })).toBeInTheDocument()
  })
})
