import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LetterLockedError, type Letter } from './api'
import { EnvelopeOpening } from './EnvelopeOpening'

// A plain function, not vi.fn(): Vitest's spy tracking reports promises its
// mocks reject as unhandled even when the component catches them.
const calls = vi.fn()
let respond: (letterId: string) => Promise<unknown> = () => Promise.resolve({})
const mutateAsync = (letterId: string) => {
  calls(letterId)
  return respond(letterId)
}

vi.mock('motion/react', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal()
  return { ...actual, useReducedMotion: () => true }
})
vi.mock('./hooks', () => ({ useOpenLetter: () => ({ mutateAsync, isPending: false }) }))

const letter: Letter = {
  id: 'letter-1',
  label: 'Open when you miss me',
  unlock_type: 'on_demand',
  unlock_at: null,
  status: 'published',
  sort_order: 0,
  first_opened_at: null,
  created_by: null,
  created_at: '',
  updated_at: '',
}

describe('EnvelopeOpening', () => {
  beforeEach(() => {
    calls.mockReset()
    respond = () => Promise.resolve({})
  })

  it('asks the database to open the letter only when the seal is tapped, then continues', async () => {
    respond = () => Promise.resolve({ letterId: 'letter-1' })
    const onOpened = vi.fn()
    render(<EnvelopeOpening letter={letter} onOpened={onOpened} onCancel={vi.fn()} />)

    expect(screen.getByText('Tap the seal to open')).toBeInTheDocument()
    expect(calls).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Break the seal to open the letter' }))
    expect(calls).toHaveBeenCalledWith('letter-1')
    await waitFor(() => expect(onOpened).toHaveBeenCalledWith('letter-1'))
  })

  it('stays sealed and says "not yet" when the database refuses', async () => {
    respond = () => Promise.reject(new LetterLockedError())
    const onOpened = vi.fn()
    render(<EnvelopeOpening letter={letter} onOpened={onOpened} onCancel={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Break the seal to open the letter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This letter isn’t ready yet.')
    expect(onOpened).not.toHaveBeenCalled()
  })

  it('offers a retry message on network trouble', async () => {
    respond = () => Promise.reject(new Error('network'))
    render(<EnvelopeOpening letter={letter} onOpened={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Break the seal to open the letter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t open it. Try again?')
  })

  it('can be dismissed without opening', async () => {
    const onCancel = vi.fn()
    render(<EnvelopeOpening letter={letter} onOpened={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onCancel).toHaveBeenCalled()
    expect(calls).not.toHaveBeenCalled()
  })
})
