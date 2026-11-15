import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { PARTNER_LOGIN_ADDRESS } from '@/lib/constants'
import { copy } from '@/lib/copy'
import { KeyLanding } from './KeyLanding'

const signInWithPassword = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: (...args: unknown[]) => signInWithPassword(...args) } },
}))

const VALID_KEY = 'K'.repeat(43)

function renderAt(hash: string) {
  window.history.replaceState(null, '', `/key${hash}`)
  return render(
    <MemoryRouter initialEntries={['/key']}>
      <Routes>
        <Route path="/key" element={<KeyLanding />} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('KeyLanding', () => {
  beforeEach(() => signInWithPassword.mockReset())

  it('removes the key from the address bar before signing in, then goes home', async () => {
    let hashAtSignIn: string | null = null
    signInWithPassword.mockImplementation(() => {
      hashAtSignIn = window.location.hash
      return Promise.resolve({ error: null })
    })

    renderAt(`#k=${VALID_KEY}`)

    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(signInWithPassword).toHaveBeenCalledTimes(1)
    expect(signInWithPassword).toHaveBeenCalledWith({ email: PARTNER_LOGIN_ADDRESS, password: VALID_KEY })
    expect(hashAtSignIn).toBe('')
    expect(window.location.hash).toBe('')
  })

  it('shows the missing-key message and never calls the API for a malformed link', async () => {
    renderAt('#k=too-short')
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.key.missing)
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
  })

  it('explains a rotated or wrong key without mentioning anyone', async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 400, message: 'Invalid login credentials' } })
    renderAt(`#k=${VALID_KEY}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.key.invalid)
  })

  it('distinguishes service trouble from a bad key', async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 503, message: 'unavailable' } })
    renderAt(`#k=${VALID_KEY}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.key.unavailable)
  })
})
