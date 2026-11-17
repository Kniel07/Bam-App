import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { resetBackStackForTests } from './backStack'

const flush = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))

/** jsdom fires popstate asynchronously after history.back()/go(). */
async function pressBack() {
  await act(async () => {
    window.history.back()
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

function Harness() {
  const [isOuterOpen, setIsOuterOpen] = useState(false)
  const [isInnerOpen, setIsInnerOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setIsOuterOpen(true)}>
        open outer
      </button>
      <Sheet isOpen={isOuterOpen && !isInnerOpen} onClose={() => setIsOuterOpen(false)} title="Outer">
        <button type="button" onClick={() => setIsInnerOpen(true)}>
          open inner
        </button>
      </Sheet>
      <Sheet isOpen={isOuterOpen && isInnerOpen} onClose={() => setIsInnerOpen(false)} title="Inner">
        <p>inner content</p>
      </Sheet>
      <p>
        outer {isOuterOpen ? 'open' : 'closed'}, inner {isInnerOpen ? 'open' : 'closed'}
      </p>
    </>
  )
}

describe('Android back button closes sheets', () => {
  beforeEach(() => {
    resetBackStackForTests()
    window.history.replaceState(null, '', '/')
  })

  it('back closes the open sheet instead of leaving the page', async () => {
    render(<Harness />)
    const startLength = window.history.length
    await userEvent.click(screen.getByRole('button', { name: 'open outer' }))
    await flush()
    expect(window.history.length).toBe(startLength + 1)

    await pressBack()
    expect(screen.getByText('outer closed, inner closed')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('closing with the X removes the history entry again', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'open outer' }))
    await flush()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await flush()
    expect(screen.getByText('outer closed, inner closed')).toBeInTheDocument()
    // We are back on the original entry (no sheet marker left on top).
    expect((window.history.state as Record<string, unknown> | null)?.__sheetDepth ?? 0).toBe(0)
  })

  it('a sheet replaced by another in the same render keeps one entry; back closes the visible one', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'open outer' }))
    await flush()
    const lengthWithOuter = window.history.length
    await userEvent.click(screen.getByRole('button', { name: 'open inner' }))
    await flush()
    expect(window.history.length).toBe(lengthWithOuter)

    await pressBack()
    expect(screen.getByText('outer open, inner closed')).toBeInTheDocument()
  })
})
